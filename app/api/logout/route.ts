import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

function isSupabaseAuthCookie(name: string) {
  return name.startsWith('sb-') || name.startsWith('supabase-auth-token')
}

async function clearSupabaseAuthCookies() {
  const cookieStore = await cookies()

  for (const cookie of cookieStore.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue

    try {
      cookieStore.delete(cookie.name)
    } catch {
      // Ignore and fall back to overwriting with an expired cookie.
    }

    try {
      cookieStore.set(cookie.name, '', {
        path: '/',
        expires: new Date(0),
        maxAge: 0,
      })
    } catch {
      // Best-effort cleanup (e.g. if running in a context where setting cookies isn't allowed).
    }
  }
}

export async function POST() {
  const supabase = await createClient()

  // Idempotent: even if the user is already signed out, we still clear cookies.
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.auth.signOut()
    }
  } catch (error) {
    console.error('Logout signOut error:', error)
  }

  await clearSupabaseAuthCookies()

  return NextResponse.json({ success: true })
}
