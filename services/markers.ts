import { createClient } from '@/lib/supabase'

export interface Marker {
  id: string
  user_id: string
  lat: number
  lng: number
  title: string
  created_at: string
}

export class MarkersService {
  private supabase = createClient()

  async getMarkers(): Promise<Marker[]> {
    const { data, error } = await this.supabase
      .from('markers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async createMarker(marker: Omit<Marker, 'id' | 'created_at'>): Promise<Marker> {
    const { data, error } = await this.supabase
      .from('markers')
      .insert(marker)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateMarker(id: string, updates: Partial<Pick<Marker, 'lat' | 'lng' | 'title'>>): Promise<Marker> {
    const { data, error } = await this.supabase
      .from('markers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteMarker(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('markers')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const markersService = new MarkersService()
