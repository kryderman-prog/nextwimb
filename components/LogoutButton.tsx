'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setError(null)

    try {
      router.push('/logout')
    } catch (err) {
      console.error('Logout error:', err)
      setError('Failed to log out. Please try again.')
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="text-sm text-gray-600 hover:text-primary-color transition-smooth disabled:opacity-50"
      >
        {isLoggingOut ? 'Logging out…' : 'Logout'}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </div>
  )
}
