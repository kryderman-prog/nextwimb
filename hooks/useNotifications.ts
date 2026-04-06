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

/**
 * useNotifications - Fetch and manage user invitations with real-time updates
 * 
 * Key features:
 * - Waits for auth to be initialized before fetching
 * - Real-time subscription to new invitations
 * - Optimistic accept/reject UI updates
 */
export function useNotifications() {
  const supabase = useSupabase()
  const { session, loading: authLoading, isInitialized } = useAuth()
  const userId = session?.user?.id ?? null
  const isLoggedIn = !!userId

  const [state, setState] = useState<State>({ invitations: [], loading: true })
  const [isMutating, setIsMutating] = useState<string | null>(null)

  /**
   * Fetch pending invitations for the current user
   * Only runs after auth is initialized
   */
  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ invitations: [], loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true }))
    try {
      console.log('[useNotifications] Fetching invitations for user:', userId)
      const invitations = await fetchPendingInvitations(supabase, userId)
      setState({ invitations, loading: false })
    } catch (error) {
      console.error('[useNotifications] Fetch error:', error)
      setState({ invitations: [], loading: false })
    }
  }, [supabase, userId])

  /**
   * Initial load: fetch invitations once auth is ready
   */
  useEffect(() => {
    // Wait for auth to be initialized before fetching
    if (!isInitialized) {
      console.log('[useNotifications] Waiting for auth initialization...')
      return
    }

    console.log('[useNotifications] Auth initialized, fetching invitations')
    void refresh()
  }, [isInitialized, refresh])

  /**
   * Real-time subscription: listen for new invitations
   */
  useEffect(() => {
    if (!userId) return

    console.log('[useNotifications] Setting up real-time subscription for user:', userId)

    const channel = supabase
      .channel(`circle-invitations:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_invitations' },
        (payload) => {
          const row = payload.new as CircleInvitationRow
          if (row.invited_user_id !== userId) return
          if (row.status !== 'pending') return

          console.log('[useNotifications] New invitation received:', row.id)

          setState((prev) => {
            // Don't add if already exists
            if (prev.invitations.some((i) => i.id === row.id)) return prev
            // Add new invitation to list
            return { ...prev, invitations: [{ ...row, sender: null }, ...prev.invitations] }
          })
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  /**
   * Accept an invitation
   */
  const acceptInvite = useCallback(
    async (inviteId: string) => {
      if (!userId) return
      if (isMutating) return

      const invite = state.invitations.find((i) => i.id === inviteId)
      if (!invite) return

      setIsMutating(inviteId)
      try {
        await acceptInvitation(supabase, invite, userId)
        // Optimistically remove from UI
        setState((prev) => ({
          ...prev,
          invitations: prev.invitations.filter((i) => i.id !== inviteId),
        }))
      } catch (error) {
        console.error('[useNotifications] Accept error:', error)
      } finally {
        setIsMutating(null)
      }
    },
    [supabase, userId, isMutating, state.invitations]
  )

  /**
   * Reject an invitation
   */
  const rejectInvite = useCallback(
    async (inviteId: string) => {
      if (!userId) return
      if (isMutating) return

      const invite = state.invitations.find((i) => i.id === inviteId)
      if (!invite) return

      setIsMutating(inviteId)
      try {
        await rejectInvitation(supabase, invite, userId)
        // Optimistically remove from UI
        setState((prev) => ({
          ...prev,
          invitations: prev.invitations.filter((i) => i.id !== inviteId),
        }))
      } catch (error) {
        console.error('[useNotifications] Reject error:', error)
      } finally {
        setIsMutating(null)
      }
    },
    [supabase, userId, isMutating, state.invitations]
  )

  const count = useMemo(() => state.invitations.length, [state.invitations])

  return {
    notifications: state.invitations,
    count,
    loading: state.loading,
    acceptInvite,
    rejectInvite,
    isMutating,
    isLoggedIn,
  }
}

