'use client'

import { useAuth } from '@/hooks/useAuth'
import UserSearch from './UserSearch'
import LogoutButton from './LogoutButton'

export default function Navbar() {
  const { profile } = useAuth()

  return (
    <nav className="glassmorphism border-b border-gray-200 px-4 py-3 relative z-[1500]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary-color">WIMB</h1>
          {profile && (
            <span className="text-sm text-gray-600">
              Welcome, {profile.firstname}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <UserSearch />
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}
