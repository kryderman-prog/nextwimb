'use client'

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo, useRef } from 'react'
import { User, type Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  google_id: string
  username: string
  firstname: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  session: Session | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const didRefreshRef = useRef(false)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      return
    }

    setProfile(data)
  }, [supabase])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session ?? null)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session ?? null)
          setUser(session?.user ?? null)
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error('Error handling auth state change:', error)
          setSession(null)
          setUser(null)
          setProfile(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, loadProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (didRefreshRef.current) return
    didRefreshRef.current = true
    console.log('[AuthProvider] router.refresh() to sync server/client session')
    router.refresh()
  }, [loading, user, router])

  return (
    <AuthContext.Provider value={{ user, profile, loading, session, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
