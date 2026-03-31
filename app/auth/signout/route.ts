import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
    } catch {}

    try {
      cookieStore.set(cookie.name, '', { path: '/', expires: new Date(0), maxAge: 0 })
    } catch {}
  }
}

export async function POST() {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }

  await clearSupabaseAuthCookies()
  revalidatePath('/', 'layout')
  redirect('/login')
}
