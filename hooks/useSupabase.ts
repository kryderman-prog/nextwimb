import { useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'

export function useSupabase() {
  return useMemo(() => createClient(), [])
}