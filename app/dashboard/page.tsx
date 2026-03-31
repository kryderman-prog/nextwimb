'use client'

import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'

// Dynamically import components that use window
const Navbar = dynamic(() => import('@/components/Navbar'), { ssr: false })
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return null
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-bg-color"
    >
      <Navbar />
      <main className="h-[calc(100vh-80px)]">
        <MapComponent />
      </main>
    </motion.div>
  )
}
