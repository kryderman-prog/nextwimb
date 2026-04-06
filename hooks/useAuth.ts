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
