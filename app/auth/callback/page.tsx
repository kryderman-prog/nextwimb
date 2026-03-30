import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { authService } from '@/services/authService'

export default async function AuthCallbackPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Auth callback error:', error)
    redirect('/auth/login?error=auth_callback_error')
  }

  if (data.session?.user) {
    try {
      await authService.getOrCreateUser(data.session.user)
      redirect('/dashboard')
    } catch (err) {
      console.error('Error creating user:', err)
      redirect('/auth/login?error=user_creation_error')
    }
  } else {
    redirect('/auth/login')
  }
}