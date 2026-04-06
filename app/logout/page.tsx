'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

function isSupabaseAuthKey(key: string) {
  return key.startsWith('sb-') || key.includes('supabase')
}

function clearStorage(storage: Storage | undefined) {
  if (!storage) return

  try {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (!key) continue
      if (!isSupabaseAuthKey(key)) continue
      storage.removeItem(key)
    }
  } catch (error) {
    console.error('[logout] Failed clearing storage:', error)
  }
}

function clearSupabaseCookies() {
  // This only clears non-HttpOnly cookies. Server-side cookies (HttpOnly) are
  // cleared via the POST to `/auth/signout` below.
  try {
    const cookiePairs = document.cookie ? document.cookie.split('; ') : []
    for (const pair of cookiePairs) {
      const name = pair.split('=')[0]
      if (!name) continue
      if (!name.startsWith('sb-') && !name.startsWith('supabase-auth-token')) continue

      // Expire cookie on root path
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
    }
  } catch (error) {
    console.error('[logout] Failed clearing cookies:', error)
  }
}

async function clearServerSupabaseCookies() {
  // Uses existing route handler to clear SSR auth cookies and revalidate.
  try {
    await fetch('/auth/signout', { method: 'POST', redirect: 'manual' })
  } catch (error) {
    console.error('[logout] Failed calling /auth/signout:', error)
  }
}

export default function LogoutPage() {
  const router = useRouter()
  const ranRef = useRef(false)
  const [message] = useState('Logging out...')

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const supabase = createClient()

    const run = async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) console.error('[logout] supabase.auth.signOut error:', error)
      } catch (error) {
        console.error('[logout] supabase.auth.signOut threw:', error)
      } finally {
        clearStorage(typeof window !== 'undefined' ? window.localStorage : undefined)
        clearStorage(typeof window !== 'undefined' ? window.sessionStorage : undefined)
        clearSupabaseCookies()
        await clearServerSupabaseCookies()

        // Ensure UI reflects the logged-out state immediately.
        try {
          router.refresh()
        } catch {}

        // Prefer a full navigation so middleware + server components see cleared cookies.
        window.location.replace('/login')
      }
    }

    void run()
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-600">{message}</p>
    </main>
  )
}
