import type { SupabaseClient } from '@supabase/supabase-js'

export type InvitationStatus = 'pending' | 'accepted' | 'rejected'

export type CircleInvitationRow = {
  id: string
  circle_id: string
  invited_user_id: string
  invited_by_user_id: string
  status: InvitationStatus
  created_at: string
  responded_at?: string | null
}

export type InvitationWithSender = CircleInvitationRow & {
  sender?: {
    id: string
    firstname?: string | null
    username?: string | null
  } | null
}

type SenderRow = {
  id: string
  firstname?: string | null
  username?: string | null
}

export async function fetchPendingInvitations(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationWithSender[]> {
  const { data: rows, error } = await supabase
    .from('circle_invitations')
    .select('id,circle_id,invited_user_id,invited_by_user_id,status,created_at,responded_at')
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  const invitations = (rows ?? []) as CircleInvitationRow[]
  const senderIds = Array.from(
    new Set(invitations.map((i) => i.invited_by_user_id).filter((v): v is string => typeof v === 'string' && v.length > 0))
  )

  if (senderIds.length === 0) return invitations.map((i) => ({ ...i, sender: null }))

  const { data: senders, error: senderError } = await supabase
    .from('users')
    .select('id,firstname,username')
    .in('id', senderIds)

  if (senderError) {
    console.error('[notificationService] sender fetch error:', senderError)
    return invitations.map((i) => ({ ...i, sender: null }))
  }

  const senderById = new Map((senders ?? []).map((s) => [s.id as string, s as SenderRow]))

  return invitations.map((invite) => {
    return {
      ...invite,
      sender: senderById.get(invite.invited_by_user_id) ?? null,
    }
  })
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  invite: CircleInvitationRow,
  currentUserId: string
) {
  if (invite.invited_user_id !== currentUserId) throw new Error('Unauthorized')

  const { data: updated, error } = await supabase
    .from('circle_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('invited_user_id', currentUserId)
    .select('id,circle_id,invited_user_id,invited_by_user_id,status,created_at,responded_at')
    .maybeSingle()

  if (error) throw error

  // Create relationship
  const { error: memberError } = await supabase
    .from('circle_members')
    .insert({ circle_id: invite.circle_id, user_id: invite.invited_user_id })

  if (memberError) console.error('[notificationService] circle_members insert error:', memberError)

  return updated
}

export async function rejectInvitation(
  supabase: SupabaseClient,
  invite: CircleInvitationRow,
  currentUserId: string
) {
  if (invite.invited_user_id !== currentUserId) throw new Error('Unauthorized')

  const { data: updated, error } = await supabase
    .from('circle_invitations')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('invited_user_id', currentUserId)
    .select('id,circle_id,invited_user_id,invited_by_user_id,status,created_at,responded_at')
    .maybeSingle()

  if (error) throw error
  return updated
}
