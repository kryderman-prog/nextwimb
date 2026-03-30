'use client'

import { useAuth } from '@/hooks/useAuth'
import UserSearch from './UserSearch'

export default function Navbar() {
  const { profile, signOut } = useAuth()

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
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-primary-color transition-smooth"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
