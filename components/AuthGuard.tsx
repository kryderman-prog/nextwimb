'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AuthGuard({
  children,
  redirectTo = '/login',
}: {
  children: ReactNode
  redirectTo?: string
}) {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace(redirectTo)
    }
  }, [loading, session, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-color">
        <div className="text-sm text-gray-600">Checking session…</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-color">
        <div className="text-sm text-gray-600">Redirecting…</div>
      </div>
    )
  }

  return <>{children}</>
}

