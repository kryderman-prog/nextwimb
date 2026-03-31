import type { SupabaseClient } from '@supabase/supabase-js'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'rejected'

export type CircleInvitationRow = {
  id: string
  status: InvitationStatus
  created_at?: string
  circle_id?: string | null

  // Sender/receiver column variants
  sender_id?: string | null
  receiver_id?: string | null
  invited_by_user_id?: string | null
  invited_user_id?: string | null
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

function getReceiverId(invite: CircleInvitationRow) {
  return invite.receiver_id ?? invite.invited_user_id ?? null
}

function getSenderId(invite: CircleInvitationRow) {
  return invite.sender_id ?? invite.invited_by_user_id ?? null
}

async function tryFetchPendingInvites(
  supabase: SupabaseClient,
  userId: string,
  receiverColumn: 'receiver_id' | 'invited_user_id'
) {
  return supabase
    .from('circle_invitations')
    .select('id,status,created_at,circle_id,sender_id,receiver_id,invited_by_user_id,invited_user_id')
    .eq(receiverColumn, userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
}

export async function fetchPendingInvitations(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationWithSender[]> {
  // Attempt both common schemas (receiver_id/sender_id) and (invited_user_id/invited_by_user_id).
  const primary = await tryFetchPendingInvites(supabase, userId, 'receiver_id')
  const fallback =
    primary.error?.message?.toLowerCase().includes('column') ||
    primary.error?.message?.toLowerCase().includes('receiver_id')
      ? await tryFetchPendingInvites(supabase, userId, 'invited_user_id')
      : null

  const rows = (fallback ? fallback.data : primary.data) as CircleInvitationRow[] | null
  const error = fallback ? fallback.error : primary.error
  if (error) throw error

  const invitations = rows ?? []
  const senderIds = Array.from(
    new Set(invitations.map(getSenderId).filter((v): v is string => typeof v === 'string' && v.length > 0))
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
    const senderId = getSenderId(invite)
    return {
      ...invite,
      sender: senderId ? (senderById.get(senderId) ?? null) : null,
    }
  })
}

async function updateInviteStatus(
  supabase: SupabaseClient,
  inviteId: string,
  receiverId: string,
  nextStatus: 'accepted' | 'rejected'
) {
  // Try "rejected" first as requested; if schema uses "declined", fall back.
  const attempt = await supabase
    .from('circle_invitations')
    .update({ status: nextStatus })
    .eq('id', inviteId)
    .or(`receiver_id.eq.${receiverId},invited_user_id.eq.${receiverId}`)
    .select('id,status,created_at,circle_id,sender_id,receiver_id,invited_by_user_id,invited_user_id')
    .maybeSingle()

  if (!attempt.error || nextStatus !== 'rejected') return attempt

  const message = attempt.error.message?.toLowerCase?.() ?? ''
  if (!message.includes('invalid') && !message.includes('enum') && !message.includes('status')) return attempt

  return supabase
    .from('circle_invitations')
    .update({ status: 'declined' })
    .eq('id', inviteId)
    .or(`receiver_id.eq.${receiverId},invited_user_id.eq.${receiverId}`)
    .select('id,status,created_at,circle_id,sender_id,receiver_id,invited_by_user_id,invited_user_id')
    .maybeSingle()
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  invite: CircleInvitationRow,
  currentUserId: string
) {
  const receiverId = getReceiverId(invite)
  if (!receiverId || receiverId !== currentUserId) throw new Error('Unauthorized')

  const { data: updated, error } = await updateInviteStatus(supabase, invite.id, receiverId, 'accepted')
  if (error) throw error

  // Best-effort relationship creation if circle_id + circle_members exist.
  const circleId = invite.circle_id ?? null
  if (circleId) {
    const { error: memberError } = await supabase
      .from('circle_members')
      .insert({ circle_id: circleId, user_id: receiverId })

    if (memberError) {
      console.error('[notificationService] circle_members insert error:', memberError)
    }
  }

  return updated
}

export async function rejectInvitation(
  supabase: SupabaseClient,
  invite: CircleInvitationRow,
  currentUserId: string
) {
  const receiverId = getReceiverId(invite)
  if (!receiverId || receiverId !== currentUserId) throw new Error('Unauthorized')

  const { data: updated, error } = await updateInviteStatus(supabase, invite.id, receiverId, 'rejected')
  if (error) throw error
  return updated
}
