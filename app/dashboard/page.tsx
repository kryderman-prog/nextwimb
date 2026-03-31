'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import AuthGuard from '@/components/AuthGuard'

// Dynamically import components that use window
const Navbar = dynamic(() => import('@/components/Navbar'), { ssr: false })
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

export default function DashboardPage() {
  return (
    <AuthGuard>
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
    </AuthGuard>
  )
}
