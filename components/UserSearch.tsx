'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { userService, UserProfile } from '@/services/userService'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/EmptyState'

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const supabase = useSupabase()
  const searchRef = useRef<HTMLDivElement>(null)
  const latestRequestIdRef = useRef(0)
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(() => new Set())
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = useCallback(async (query: string) => {
    const requestId = ++latestRequestIdRef.current
    console.log('[UserSearch] API CALL:', query)

    try {
      const results = await userService.searchUsers(query, user?.id)
      if (requestId !== latestRequestIdRef.current) return
      setSearchResults(results)
      setIsOpen(true)
      setIsSearching(false)
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      console.error('[UserSearch] Search error:', error)
      setSearchResults([])
      setIsOpen(true)
      setIsSearching(false)
    }
  }, [user])

  useEffect(() => {
    console.log('[UserSearch] searchTerm update:', searchTerm)

    const query = searchTerm.trim()
    if (query.length < 2) return

    const debounceTimer = setTimeout(() => {
      setIsOpen(true)
      void performSearch(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, performSearch])

  const markUserAsInvited = (invitedUserId: string) => {
    setInvitedUsers((prev) => {
      const next = new Set(prev)
      next.add(invitedUserId)
      return next
    })
  }

  const ensureUserExists = useCallback(
    async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null } | null) => {
      if (!authUser?.id) return

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single()

      // If user already exists → do nothing
      if (data) return

      // If not found → insert
      if (error && (error as { code?: string }).code === 'PGRST116') {
        const metadata = authUser.user_metadata ?? {}
        const googleId =
          (metadata.provider_id as string | undefined) ||
          authUser.id

        const fullName =
          (metadata.full_name as string | undefined) ||
          (metadata.name as string | undefined) ||
          null

        const username = fullName || authUser.email?.split('@')[0] || 'user'
        const firstname = fullName?.split(' ')[0] || 'User'

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            google_id: googleId,
            username,
            firstname,
          })

        if (insertError) {
          const code = (insertError as { code?: string }).code
          // Idempotent: if another request created it first, continue.
          if (code === '23505') return
          console.error('USER_CREATE_FAILED', insertError)
          throw insertError
        }

        return
      }

      if (error) throw error
    },
    [supabase]
  )

  const handleSendInvite = async (invitedUserId: string, invitedUsername: string) => {
    if (loadingUser) return
    if (invitedUsers.has(invitedUserId)) return
    if (authLoading) {
      setInviteErrors((prev) => ({ ...prev, [invitedUserId]: 'Auth is still loading. Try again.' }))
      return
    }

    setLoadingUser(invitedUserId)
    setInviteErrors((prev) => {
      const next = { ...prev }
      delete next[invitedUserId]
      return next
    })

    try {
      console.log('[UserSearch] handleSendInvite:', invitedUserId)

      const { data: { user: authedUser }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!authedUser) throw new Error('Not authenticated')

      // Prevent self-invite
      if (authedUser.id === invitedUserId) {
        console.log('[UserSearch] self-invite blocked')
        return
      }

      // Ensure sender exists in public.users (prevents FK violations in RPC inserts)
      await ensureUserExists(authedUser)

      const { data, error } = await supabase.rpc('send_circle_invite', {
        p_circle_name: `circle of ${invitedUsername}`,
        p_invited_user_id: invitedUserId,
        p_invited_by_user_id: authedUser.id,
      })

      if (error) {
        console.error('[UserSearch] RPC error:', error)
        throw error
      }

      const payload = (data ?? null) as { success?: boolean; circle_id?: string; error?: string } | null
      const payloadError = payload?.error

      if (payloadError) {
        // Treat "already exists" as success for UX (no duplicates will be created).
        if (payloadError === 'Invite already exists') {
          markUserAsInvited(invitedUserId)
          return
        }
        setInviteErrors((prev) => ({
          ...prev,
          [invitedUserId]: payloadError,
        }))
        return
      }

      if (payload?.success) {
        markUserAsInvited(invitedUserId)
        return
      }

      setInviteErrors((prev) => ({
        ...prev,
        [invitedUserId]: 'Failed to send request. Please try again.',
      }))
    } catch (err) {
      console.error('[UserSearch] Invite error:', err)
      setInviteErrors((prev) => ({
        ...prev,
        [invitedUserId]: 'Failed to send request. Please try again.',
      }))
    } finally {
      setLoadingUser(null)
    }
  }

  return (
    <div ref={searchRef} className="relative">
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => {
          const nextValue = e.target.value
          console.log('[UserSearch] onChange:', nextValue)
          setSearchTerm(nextValue)
          setSearchResults([])
          setIsOpen(false)
          setIsSearching(nextValue.trim().length >= 2)
        }}
        className="w-64 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent transition-smooth"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glassmorphism rounded-xl shadow-lg z-[2000] max-h-64 overflow-y-auto"
          >
            {isSearching ? (
              <EmptyState title="Searching…" />
            ) : searchResults.length === 0 ? (
              <EmptyState title="No users found" />
            ) : (
              searchResults.map((resultUser) => {
                const isSending = loadingUser === resultUser.id
                const isInvited = invitedUsers.has(resultUser.id)
                const inviteError = inviteErrors[resultUser.id]

                return (
                  <div
                    key={resultUser.id}
                    className="px-4 py-3 hover:bg-white hover:bg-opacity-50 transition-smooth border-b border-gray-100 last:border-b-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-primary-color">{resultUser.firstname}</div>
                      <div className="text-sm text-gray-500 truncate">@{resultUser.username}</div>
                      {inviteError ? <div className="mt-1 text-xs text-red-600">{inviteError}</div> : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSendInvite(resultUser.id, resultUser.username)}
                      disabled={isSending || isInvited}
                      className="shrink-0 text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-smooth"
                    >
                      {isInvited ? 'Request Sent' : isSending ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                )
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
