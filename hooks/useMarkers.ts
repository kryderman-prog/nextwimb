import { useState, useEffect } from 'react'
import { markersService, Marker } from '@/services/markers'
import { createClient } from '@/lib/supabase'

export function useMarkers() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadMarkers()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('markers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markers' }, () => {
        loadMarkers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMarkers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await markersService.getMarkers()
      setMarkers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markers')
    } finally {
      setLoading(false)
    }
  }

  const addMarker = async (lat: number, lng: number, title: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const newMarker = await markersService.createMarker({
        user_id: user.id,
        lat,
        lng,
        title,
      })
      setMarkers(prev => [newMarker, ...prev])
      return newMarker
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add marker')
      throw err
    }
  }

  const updateMarker = async (id: string, updates: Partial<Pick<Marker, 'lat' | 'lng' | 'title'>>) => {
    try {
      const updatedMarker = await markersService.updateMarker(id, updates)
      setMarkers(prev => prev.map(marker =>
        marker.id === id ? updatedMarker : marker
      ))
      return updatedMarker
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update marker')
      throw err
    }
  }

  const deleteMarker = async (id: string) => {
    try {
      await markersService.deleteMarker(id)
      setMarkers(prev => prev.filter(marker => marker.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete marker')
      throw err
    }
  }

  return {
    markers,
    loading,
    error,
    addMarker,
    updateMarker,
    deleteMarker,
    refreshMarkers: loadMarkers,
  }
}
