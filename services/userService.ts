import { createClient } from '@/lib/supabaseClient'

export interface UserProfile {
  id: string
  google_id: string
  username: string
  firstname: string
}

export class UserService {
  private supabase = createClient()

  async searchUsers(query: string, excludeUserId?: string): Promise<UserProfile[]> {
    let queryBuilder = this.supabase
      .from('users')
      .select('*')
      .ilike('firstname', `%${query}%`)
      .limit(10)

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('id', excludeUserId)
    }

    const { data, error } = await queryBuilder

    if (error) throw error
    return data || []
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }
}

export const userService = new UserService()