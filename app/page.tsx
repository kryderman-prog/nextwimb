import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[app/page] server user:', user?.id ?? null)

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary-color mb-6">
            WIMB
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Where Is My Buddy?
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Find your friends and family in real-time. Connect, locate, and stay close with our interactive map system.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-primary-color text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-opacity-90 transition-smooth shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}
