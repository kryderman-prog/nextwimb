'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import EmptyState from '@/components/EmptyState'

export default function NotificationBell() {
  const { notifications, count, loading, acceptInvite, rejectInvite, isMutating, isLoggedIn } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!isLoggedIn) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-gray-600 hover:text-primary-color transition-smooth"
        aria-label="Notifications"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        <span
          className={`absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full text-[10px] leading-5 text-center ${
            count > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {count}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 glassmorphism rounded-xl shadow-lg z-[2000] overflow-hidden border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-color">Notifications</span>
            {loading && <span className="text-xs text-gray-500">Loading…</span>}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <EmptyState title="No notifications" />
            ) : (
              notifications.map((invite) => {
                const senderName =
                  invite.sender?.firstname ||
                  (invite.sender?.username ? `@${invite.sender.username}` : null) ||
                  'Someone'
                const disabled = isMutating === invite.id

                return (
                  <div
                    key={invite.id}
                    className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate">
                        <span className="font-medium text-primary-color">{senderName}</span> invited you
                      </div>
                      <div className="text-xs text-gray-500">Circle invitation</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void acceptInvite(invite.id)}
                        disabled={disabled}
                        className="text-xs px-3 py-2 rounded-lg bg-primary-color text-white hover:bg-opacity-90 disabled:opacity-50 transition-smooth"
                      >
                        {disabled ? '...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectInvite(invite.id)}
                        disabled={disabled}
                        className="text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-smooth"
                      >
                        {disabled ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
