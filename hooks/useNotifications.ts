'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import {
  acceptInvitation,
  fetchPendingInvitations,
  rejectInvitation,
  type InvitationWithSender,
  type CircleInvitationRow,
} from '@/services/notificationService'

type State = {
  invitations: InvitationWithSender[]
  loading: boolean
}

export function useNotifications() {
  const supabase = useSupabase()
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user?.id ?? null

  const [state, setState] = useState<State>({ invitations: [], loading: true })
  const [isMutating, setIsMutating] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ invitations: [], loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true }))
    try {
      const invitations = await fetchPendingInvitations(supabase, userId)
      setState({ invitations, loading: false })
    } catch (error) {
      console.error('[useNotifications] fetch error:', error)
      setState({ invitations: [], loading: false })
    }
  }, [supabase, userId])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`circle-invitations:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_invitations' },
        (payload) => {
          const row = payload.new as CircleInvitationRow
          const receiver = row.receiver_id ?? row.invited_user_id ?? null
          if (receiver !== userId) return
          if (row.status !== 'pending') return

          setState((prev) => {
            if (prev.invitations.some((i) => i.id === row.id)) return prev
            // Keep it minimal: we add without sender info and let next refresh fill it.
            return { ...prev, invitations: [{ ...row, sender: null }, ...prev.invitations] }
          })
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const accept = useCallback(
    async (invite: InvitationWithSender) => {
      if (!userId) return
      if (isMutating) return
      setIsMutating(invite.id)
      try {
        await acceptInvitation(supabase, invite, userId)
        setState((prev) => ({
          ...prev,
          invitations: prev.invitations.filter((i) => i.id !== invite.id),
        }))
      } catch (error) {
        console.error('[useNotifications] accept error:', error)
      } finally {
        setIsMutating(null)
      }
    },
    [supabase, userId, isMutating]
  )

  const reject = useCallback(
    async (invite: InvitationWithSender) => {
      if (!userId) return
      if (isMutating) return
      setIsMutating(invite.id)
      try {
        await rejectInvitation(supabase, invite, userId)
        setState((prev) => ({
          ...prev,
          invitations: prev.invitations.filter((i) => i.id !== invite.id),
        }))
      } catch (error) {
        console.error('[useNotifications] reject error:', error)
      } finally {
        setIsMutating(null)
      }
    },
    [supabase, userId, isMutating]
  )

  const count = state.invitations.length

  return useMemo(
    () => ({
      invitations: state.invitations,
      count,
      loading: state.loading || authLoading,
      isMutating,
      refresh,
      accept,
      reject,
      isLoggedIn: !!userId,
    }),
    [state.invitations, state.loading, authLoading, count, isMutating, refresh, accept, reject, userId]
  )
}

