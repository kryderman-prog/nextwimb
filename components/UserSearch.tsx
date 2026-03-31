'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { userService, UserProfile } from '@/services/userService'
import { motion, AnimatePresence } from 'framer-motion'

export default function UserSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        setIsOpen(false)
        return
      }

      try {
        setSearchResults([])
        setIsOpen(false)
        const results = await userService.searchUsers(searchQuery, user?.id)
        setSearchResults(results)
        setIsOpen(results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
        setIsOpen(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, user?.id])

  return (
    <div ref={searchRef} className="relative">
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-64 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent transition-smooth"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 glassmorphism rounded-xl shadow-lg z-[2000] max-h-64 overflow-y-auto"
          >
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="px-4 py-3 hover:bg-white hover:bg-opacity-50 cursor-pointer transition-smooth border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-primary-color">{user.firstname}</div>
                <div className="text-sm text-gray-500">@{user.username}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
