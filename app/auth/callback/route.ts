import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

async function getOrCreateUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return

  const googleId = (user.user_metadata?.provider_id as string | undefined) || user.id

  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single()

  // If "no rows", Supabase returns an error; treat that as "needs insert".
  if (existingUser) return existingUser
  if (existingUserError && existingUserError.code !== 'PGRST116') {
    throw existingUserError
  }

  const newUser = {
    id: user.id,
    google_id: googleId,
    username:
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'user',
    firstname:
      (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
      'User',
  }

  const { data, error } = await supabase.from('users').insert(newUser).select().single()
  if (error) throw error
  return data
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth exchange failed:', error)
      return NextResponse.redirect(new URL('/auth/login?error=oauth_exchange_failed', url))
    }

    try {
      await getOrCreateUser(supabase)
    } catch (err) {
      console.error('User bootstrap failed:', err)
      // Session is set; let the app continue and load profile client-side.
    }
  }

  return NextResponse.redirect(new URL('/dashboard', url))
}

