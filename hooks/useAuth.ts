'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useSupabase } from '@/hooks/useSupabase'

export function useAuth() {
  const supabase = useSupabase()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!mounted) return
        setSession(data.session ?? null)
      } catch (error) {
        console.error('[useAuth] getSession error:', error)
        if (!mounted) return
        setSession(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    console.log('[useAuth] mount: loading session')
    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] onAuthStateChange:', event, {
        hasSession: !!session,
        expiresAt: session?.expires_at,
      })
      setSession(session ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    console.log('[useAuth] state:', { loading, hasSession: !!session })
  }, [loading, session])

  return { session, loading }
}
