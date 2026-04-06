'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useSupabase } from '@/hooks/useSupabase'

export function useAuth() {
  const supabase = useSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadAuthState = async () => {
      try {
        const [{ data: userData, error: userError }, { data: sessionData, error: sessionError }] =
          await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

        if (userError) console.error('[useAuth] getUser error:', userError)
        if (sessionError) console.error('[useAuth] getSession error:', sessionError)

        if (!active) return

        const nextUser = userData.user ?? null
        // Treat `user` as the source of truth; a stale client session should not
        // be considered authenticated if `getUser()` returns null.
        const nextSession = nextUser ? (sessionData.session ?? null) : null

        setUser(nextUser)
        setSession(nextSession)
      } catch (error) {
        console.error('[useAuth] load auth state error:', error)
        if (!active) return
        setSession(null)
        setUser(null)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void loadAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return { session, user, loading }
}
