'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import UserSearch from './UserSearch'
import LogoutButton from './LogoutButton'
import NotificationBell from './NotificationBell'

interface SkeletonProps {
  className: string
}

/**
 * Skeleton component for loading states
 * Prevents layout shift while auth state is loading
 */
function SkeletonLoader({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Navbar component
 * 
 * Architecture:
 * - Left section: Logo (always visible)
 * - Center section: Search (only when authenticated)
 * - Right section: Auth UI (loading state, user info, or login button)
 * 
 * Hydration-safe:
 * - Not dynamically imported
 * - Shows skeletons during loading
 * - Never returns null or empty
 */
export default function Navbar() {
  const { user, loading, isInitialized } = useAuth()

  // Extract user info from metadata
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    null

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null

  const isAuthenticated = !!user
  const isAuthLoading = loading || !isInitialized

  return (
    <nav
      className="glassmorphism border-b border-gray-200 px-4 py-3 relative z-[1500]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* LEFT SECTION: Logo (always visible) */}
        <div className="flex items-center gap-4 min-w-0 shrink-0">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-primary-color shrink-0 hover:opacity-80 transition-opacity"
            aria-label="WIMB - Go to dashboard"
          >
            WIMB
          </Link>
        </div>

        {/* CENTER SECTION: Search (only if authenticated) */}
        <div className="flex-1 flex justify-center px-4 min-w-0">
          {isAuthLoading ? (
            // Loading skeleton
            <SkeletonLoader className="h-10 w-64 rounded-xl" />
          ) : isAuthenticated ? (
            // Show search when authenticated
            <UserSearch />
          ) : (
            // Placeholder for layout stability when not authenticated
            <div className="w-64" aria-hidden="true" />
          )}
        </div>

        {/* RIGHT SECTION: Auth UI */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {isAuthLoading ? (
            // Loading state: show skeleton placeholders
            <>
              <SkeletonLoader className="h-9 w-9 rounded-full" />
              <SkeletonLoader className="h-9 w-24 rounded-xl" />
            </>
          ) : isAuthenticated ? (
            // Authenticated state: show user info and logout
            <>
              <NotificationBell />
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName ? `${displayName}'s avatar` : 'User avatar'}
                    className="h-9 w-9 rounded-full border border-gray-200 object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  // Fallback: avatar initials
                  <div
                    className="h-9 w-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-xs font-semibold text-gray-700"
                    title={displayName ?? 'User'}
                  >
                    {(displayName?.trim()?.[0] ?? 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <LogoutButton />
            </>
          ) : (
            // Unauthenticated state: show login button
            <Link
              href="/auth/login"
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
