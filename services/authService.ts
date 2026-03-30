import { createClient } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  google_id: string
  username: string
  firstname: string
}

export class AuthService {
  private supabase = createClient()

  constructor() {
    console.log("🔍 AuthService constructor called")
    console.log("🔍 Supabase client created:", !!this.supabase)
  }

  async signInWithGoogle() {
    console.log("🔍 signInWithGoogle called")

    // Debug environment variables
    console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set")
    console.log("NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)
    console.log("VERCEL_URL:", process.env.VERCEL_URL)
    console.log("window.location.origin:", typeof window !== 'undefined' ? window.location.origin : 'SSR')

    // Test Supabase connection
    try {
      const { data: testData, error: testError } = await this.supabase.auth.getSession()
      console.log("Supabase connection test:", { testData, testError })
    } catch (testErr) {
      console.error("Supabase connection failed:", testErr)
    }

    // Determine the correct redirect URL
    let redirectUrl: string
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    } else if (process.env.VERCEL_URL) {
      redirectUrl = `https://${process.env.VERCEL_URL}/auth/callback`
    } else if (typeof window !== 'undefined') {
      redirectUrl = `${window.location.origin}/auth/callback`
    } else {
      // Fallback for SSR
      redirectUrl = 'http://localhost:3000/auth/callback'
    }

    console.log("Using redirect URL:", redirectUrl)

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    console.log("OAuth response:", { data, error })

    if (error) {
      console.error("OAuth error:", error)
      throw error
    }

    console.log("OAuth initiated successfully")
  }

  async getOrCreateUser(user: User): Promise<UserProfile> {
    const googleId = user.user_metadata?.provider_id || user.id

    // First, try to get existing user
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single()

    if (existingUser) {
      return existingUser
    }

    // If not exists, create new user
    const newUser = {
      id: user.id,
      google_id: googleId,
      username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'user',
      firstname: user.user_metadata?.full_name?.split(' ')[0] || 'User',
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert(newUser)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }
}

export const authService = new AuthService()