'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import AuthGuard from '@/components/AuthGuard'
import Navbar from '@/components/Navbar'

// Only MapComponent needs dynamic import as it uses window/canvas APIs
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
