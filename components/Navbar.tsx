'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import UserSearch from './UserSearch'
import LogoutButton from './LogoutButton'
import NotificationBell from './NotificationBell'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
}

export default function Navbar() {
  const { user, loading } = useAuth()
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    null
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null

  return (
    <nav className="glassmorphism border-b border-gray-200 px-4 py-3 relative z-[1500]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/dashboard" className="text-xl font-bold text-primary-color shrink-0">
            WIMB
          </Link>
        </div>

        <div className="flex-1 flex justify-center px-4">
          {loading ? (
            <Skeleton className="h-10 w-64 rounded-xl" />
          ) : user ? (
            <UserSearch />
          ) : (
            <div className="w-64" />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          {loading ? (
            <>
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </>
          ) : user ? (
            <>
              <NotificationBell />
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName ?? 'User'}
                    className="h-9 w-9 rounded-full border border-gray-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-xs font-semibold text-gray-700">
                    {(displayName?.trim()?.[0] ?? 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-smooth"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
