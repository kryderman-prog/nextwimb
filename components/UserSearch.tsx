'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthContext } from '@/hooks/auth-context'
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
  const { user } = useAuthContext()
  const { loading: authLoading } = useAuth()
  const supabase = useSupabase()
  const searchRef = useRef<HTMLDivElement>(null)
  const latestRequestIdRef = useRef(0)
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(() => new Set())
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [circleId, setCircleId] = useState<string | null>(null)

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

  const resolveCircleIdForInvites = async (currentUserId: string) => {
    if (circleId) return circleId

    const tryColumns = ['owner_id', 'created_by', 'created_by_user_id', 'user_id', 'admin_id'] as const
    for (const col of tryColumns) {
      const { data, error } = await supabase
        .from('circles')
        .select('id')
        .eq(col, currentUserId)
        .limit(1)
        .maybeSingle()

      if (error) {
        const msg = error.message?.toLowerCase?.() ?? ''
        // If the column doesn't exist, try the next one.
        if (msg.includes('column') || msg.includes(col)) continue
        console.error('[UserSearch] circles lookup error:', error)
        break
      }

      const resolved = (data as { id?: string } | null)?.id ?? null
      if (resolved) {
        setCircleId(resolved)
        return resolved
      }
    }

    // Last resort: if RLS restricts circles to the current user, the first row is "their circle".
    const { data: anyCircle, error: anyCircleError } = await supabase
      .from('circles')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (anyCircleError) {
      console.error('[UserSearch] circles fallback lookup error:', anyCircleError)
      return null
    }

    const resolved = (anyCircle as { id?: string } | null)?.id ?? null
    if (resolved) {
      setCircleId(resolved)
    }
    return resolved
  }

  const handleSendInvite = async (invitedUserId: string) => {
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

      const currentCircleId = await resolveCircleIdForInvites(authedUser.id)
      if (!currentCircleId) {
        setInviteErrors((prev) => ({
          ...prev,
          [invitedUserId]: 'No circle found to invite from.',
        }))
        return
      }

      // Check existing pending invite
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from('circle_invitations')
        .select('id')
        .eq('circle_id', currentCircleId)
        .eq('invited_user_id', invitedUserId)
        .eq('status', 'pending')
        .maybeSingle()

      if (inviteCheckError) throw inviteCheckError
      if (existingInvite) {
        console.log('[UserSearch] existing pending invite, skipping insert')
        markUserAsInvited(invitedUserId)
        return
      }

      // Insert invite
      const { error: insertError } = await supabase
        .from('circle_invitations')
        .insert({
          circle_id: currentCircleId,
          invited_user_id: invitedUserId,
          invited_by_user_id: authedUser.id,
          status: 'pending',
        })

      if (insertError) {
        const code = (insertError as unknown as { code?: string }).code
        if (code === '23503') {
          const message = (insertError as unknown as { message?: string }).message?.toLowerCase?.() ?? ''
          if (message.includes('fk_invited_user') || message.includes('invited_user_id')) {
            setInviteErrors((prev) => ({
              ...prev,
              [invitedUserId]: 'This user is not available to invite yet (profile not found).',
            }))
            return
          }
          if (message.includes('fk_circle') || message.includes('circle_id')) {
            setInviteErrors((prev) => ({
              ...prev,
              [invitedUserId]: 'Unable to send invite (circle not found).',
            }))
            return
          }
        }
        if (code === '23505') {
          console.log('[UserSearch] invite already exists (unique constraint)')
          markUserAsInvited(invitedUserId)
          return
        }
        console.error('[UserSearch] Supabase insert error:', insertError)
        throw insertError
      }

      markUserAsInvited(invitedUserId)
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
                      onClick={() => void handleSendInvite(resultUser.id)}
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
