import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MapComponent from '@/components/Map'
import Link from 'next/link'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[app/map] server user:', user?.id ?? null)

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-80px)]">
        <MapComponent />
      </main>
    </div>
  )
}
