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

  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // redirectTo: `${window.location.origin}/auth/callback`,
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,

      },
    })

    if (error) throw error
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