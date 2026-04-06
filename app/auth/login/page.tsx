'use client'

import { useState, useEffect, type MouseEvent, useMemo } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useSupabase()

  // Defensive: ensure supabase is initialized
  useEffect(() => {
    if (!supabase) {
      console.error('🔍 Supabase client failed to initialize')
      setError('Failed to initialize authentication. Please refresh the page.')
    } else {
      console.log('🔍 LoginPage mounted with Supabase client')
    }
  }, [supabase])

  const handleGoogleSignIn = async (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (isLoading) {
      console.log('🔍 Sign-in already in progress, ignoring duplicate click')
      return
    }

    console.log('🔍 Login button clicked')
    
    try {
      setIsLoading(true)
      setError(null)

      if (!supabase) {
        throw new Error('Authentication client not initialized')
      }

      const redirectUrl =
        process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : 'http://localhost:3000/auth/callback'

      console.log('🔍 Using redirect URL:', redirectUrl)
      console.log('🔍 Initiating OAuth sign-in with Google')

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (signInError) {
        throw signInError
      }

      // Defensive: some client configurations may return a URL without auto-redirecting.
      if (data?.url) {
        console.log('🔍 Redirecting to OAuth provider')
        window.location.assign(data.url)
      } else {
        console.warn('🔍 No redirect URL returned from OAuth flow')
        setError('Sign-in initiated but redirect URL was not provided. Please try again.')
      }
    } catch (err) {
      console.error('🔍 Login error:', err)
      setIsLoading(false)
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to sign in with Google. Please try again.'
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-color mb-2">WIMB</h1>
          <p className="text-gray-600 mb-8">Where Is My Buddy?</p>
        </div>
        <div className="glassmorphism p-8 rounded-3xl shadow-xl">
          <h2 className="text-center text-2xl font-semibold text-primary-color mb-6">
            Sign in to continue
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs mt-2 opacity-75">Try refreshing the page if this persists.</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || !supabase}
            className="w-full flex justify-center items-center px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 mr-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

