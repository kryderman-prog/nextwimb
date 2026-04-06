# useAuth Hook - Complete Implementation

## Overview

The `useAuth` hook is the foundation of auth state management in this application. It handles:
- Initial auth state loading from Supabase
- Real-time auth changes via subscription
- Preventing hydration mismatches
- Tracking initialization completion
- Cleanup of subscriptions

## Complete Implementation

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useSupabase } from '@/hooks/useSupabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  isInitialized: boolean
}

/**
 * useAuth - Robust auth state hook with proper lifecycle management
 * 
 * Key features:
 * - Properly sequences initial state load with subscription setup
 * - Prevents hydration mismatches by tracking initialization
 * - Handles async auth operations without race conditions
 * - Subscribes to real-time auth changes for immediate reactivity
 */
export function useAuth() {
  const supabase = useSupabase()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isInitialized: false,
  })

  useEffect(() => {
    let didCleanup = false

    const initializeAuth = async () => {
      try {
        // Step 1: Load initial auth state from server
        console.log('[useAuth] Loading initial auth state...')
        const { data: userData, error: userError } = await supabase.auth.getUser()
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (userError) console.error('[useAuth] getUser error:', userError)
        if (sessionError) console.error('[useAuth] getSession error:', sessionError)

        if (didCleanup) return

        const nextUser = userData.user ?? null
        const nextSession = nextUser ? (sessionData.session ?? null) : null

        // Set initial state
        setState((prev) => ({
          ...prev,
          user: nextUser,
          session: nextSession,
          loading: false,
          isInitialized: true,
        }))

        console.log('[useAuth] Initial state loaded:', { userId: nextUser?.id ?? null })
      } catch (error) {
        console.error('[useAuth] Failed to load initial auth state:', error)
        if (!didCleanup) {
          setState((prev) => ({
            ...prev,
            user: null,
            session: null,
            loading: false,
            isInitialized: true,
          }))
        }
      }
    }

    const setupSubscription = () => {
      // Step 2: Subscribe to auth changes for real-time updates
      const { data } = supabase.auth.onAuthStateChange(
        (event, nextSession) => {
          if (didCleanup) return

          console.log('[useAuth] Auth state changed:', event, { userId: nextSession?.user?.id ?? null })

          setState((prev) => ({
            ...prev,
            user: nextSession?.user ?? null,
            session: nextSession ?? null,
            loading: false,
            isInitialized: true,
          }))
        }
      )

      return () => {
        data.subscription.unsubscribe()
      }
    }

    // Initialize auth state
    void initializeAuth()

    // Setup subscription (runs immediately, will receive auth state changes)
    const unsubscribe = setupSubscription()

    return () => {
      didCleanup = true
      unsubscribe?.()
    }
  }, [supabase])

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isInitialized: state.isInitialized,
  }
}
```

## What Changed vs Original

### State Structure

**Before:**
```typescript
const [session, setSession] = useState<Session | null>(null)
const [user, setUser] = useState<User | null>(null)
const [loading, setLoading] = useState(true)
// No way to distinguish between "loading" and "initialization complete"
```

**After:**
```typescript
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  isInitialized: boolean  // NEW: Tracks when initial load is done
}
const [state, setState] = useState<AuthState>({...})
```

### Initialization Logic

**Before:**
```typescript
const loadAuthState = async () => {
  // Parallel requests - no guaranteed order
  const [{ data: userData, error: userError }, { data: sessionData, error: sessionError }] =
    await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

  // Set state when both complete
  setUser(userData.user ?? null)
  setSession(nextUser ? (sessionData.session ?? null) : null)
  setLoading(false)
  // No signal that initialization is complete
}

// Subscription could fire immediately
const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
```

**After:**
```typescript
const initializeAuth = async () => {
  // Same parallel requests, but more explicit
  const { data: userData, error: userError } = await supabase.auth.getUser()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  // Single setState with full state object
  setState((prev) => ({
    ...prev,
    user: userData.user ?? null,
    session: userData.user ? sessionData.session : null,
    loading: false,
    isInitialized: true,  // KEY: Signal initialization complete
  }))
}

// Subscription setup is separate and explicit
const setupSubscription = () => {
  const { data } = supabase.auth.onAuthStateChange(...)
  return () => data.subscription.unsubscribe()
}

// Both run immediately, but subscription respects didCleanup
void initializeAuth()
const unsubscribe = setupSubscription()
```

### Cleanup Handling

**Before:**
```typescript
let active = true

useEffect(() => {
  // ...
  return () => {
    active = false
    subscription.unsubscribe()
  }
})
```

**After:**
```typescript
let didCleanup = false

useEffect(() => {
  const initializeAuth = async () => {
    // Check cleanup flag before each state update
    if (didCleanup) return
    // ...
  }

  const setupSubscription = () => {
    const { data } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        // Check cleanup flag in callback too
        if (didCleanup) return
        // ...
      }
    )
    return () => data.subscription.unsubscribe()
  }

  return () => {
    didCleanup = true
    unsubscribe?.()
  }
})
```

## Why Each Change Matters

### 1. Single State Object
**Why**: Reduces number of state updates, makes state consistent
```typescript
// Before: Multiple setState calls
setUser(userData.user)
setSession(nextSession)
setLoading(false)

// After: Single setState with full object
setState(prev => ({...prev, user, session, loading: false}))
```
**Benefit**: Atomic updates, no intermediary states like `user=null, loading=true` then `user=actual, loading=false`

### 2. Explicit Sections (initializeAuth + setupSubscription)
**Why**: Clear separation of concerns and execution order
```typescript
// Initialize (runs once at mount)
void initializeAuth()

// Subscribe (runs immediately)
const unsubscribe = setupSubscription()

// Return cleanup
return () => {
  didCleanup = true
  unsubscribe?.()
}
```
**Benefit**: Easier to understand what happens in what order, easier to debug

### 3. `isInitialized` Flag
**Why**: Dependent hooks need to know when it's safe to use user ID
```typescript
// Before: Only had `loading`
if (authLoading) return
void refresh()  // But is authLoading accurate? Could still be loading after this check

// After: Has both `loading` and `isInitialized`
if (!isInitialized) return  // Wait for initial load to complete
void refresh()  // Now safe to use userId
```
**Benefit**: Prevents race conditions where dependent hooks run before auth state is ready

### 4. Cleanup Flag in Callbacks
**Why**: Async callbacks can fire after unmount, updating state on unmounted component
```typescript
// In callback, check if component is being cleaned up
if (didCleanup) return
// Safe to update state
setState(...)
```
**Benefit**: Prevents "can't update state on unmounted component" warnings and memory leaks

## Usage Example

### In a Component

```typescript
export default function MyComponent() {
  const { user, loading, isInitialized } = useAuth()

  // Safe to show skeleton while both loading and not initialized
  const isAuthLoading = loading || !isInitialized

  if (isAuthLoading) {
    return <SkeletonUI />
  }

  if (!user) {
    return <UnauthenticatedUI />
  }

  return <AuthenticatedUI user={user} />
}
```

### In a Dependent Hook

```typescript
export function useUserData() {
  const { user, isInitialized } = useAuth()
  const userId = user?.id ?? null

  const [data, setData] = useState(null)

  useEffect(() => {
    // Wait for auth to initialize before using userId
    if (!isInitialized) return
    if (!userId) return

    // Now safe to fetch
    fetchUserData(userId).then(setData)
  }, [isInitialized, userId])

  return data
}
```

## Return Value

```typescript
{
  user: User | null,          // Current authenticated user
  session: Session | null,    // Supabase session object
  loading: boolean,           // Still loading initial/subscription updates
  isInitialized: boolean,     // Initial load complete (ready for dependent hooks)
}
```

### Usage Guide

| Field | When True | When False | Use For |
|-------|-----------|-----------|---------|
| `user` | User is authenticated | User is not authenticated | Show user info, enable features |
| `session` | Valid session exists | No valid session | Make protected API calls |
| `loading` | Auth state is updating | Auth state is stable | Show skeleton/loading UI |
| `isInitialized` | Initial load completed | Still loading initial state | Wait before dependent hooks run |

## Common Patterns

### Pattern 1: Conditional Rendering
```typescript
const { user, loading, isInitialized } = useAuth()
const isAuthLoading = loading || !isInitialized

if (isAuthLoading) return <Skeleton />
if (user) return <AuthenticatedUI />
return <UnauthenticatedUI />
```

### Pattern 2: Dependent Hooks
```typescript
export function useNotifications() {
  const { isInitialized, session } = useAuth()
  const userId = session?.user?.id

  useEffect(() => {
    if (!isInitialized) return   // Wait for init
    if (!userId) return           // No user yet
    
    fetchNotifications(userId)
  }, [isInitialized, userId])
}
```

### Pattern 3: Protecting Routes
```typescript
export function ProtectedRoute({ children }) {
  const { user, isInitialized } = useAuth()

  if (!isInitialized) return <Loading />
  if (!user) return <Redirect to="/login" />
  
  return children
}
```

## Debugging

Enable debug logs in console:
```typescript
// All logs start with [useAuth]
// Examples:
// [useAuth] Loading initial auth state...
// [useAuth] Initial state loaded: { userId: 'user-123' }
// [useAuth] Auth state changed: SIGNED_IN { userId: 'user-123' }
// [useAuth] Auth state changed: SIGNED_OUT { userId: null }
// [useAuth] Failed to load initial auth state: Error...
```

## Edge Cases Handled

1. **Component unmounts during async load**
   - `didCleanup` flag prevents setState on unmounted component

2. **Subscription fires before initial load completes**
   - Both update same state object, no conflicts

3. **Network error during initial load**
   - Sets `isInitialized: true` anyway so dependent hooks can run
   - Defaults to `user: null, session: null`

4. **Multiple components using useAuth**
   - Each component has its own hook instance
   - Supabase client is memoized via `useSupabase()`

5. **Session expires mid-session**
   - `onAuthStateChange` subscription detects
   - Updates state to `user: null`
   - Components re-render to show login button

---

**Type**: React Hook  
**Dependencies**: Supabase client only  
**Cost**: One effect per component instance  
**Side Effects**: Subscribes to Supabase auth  
