'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useMarkers } from '@/hooks/useMarkers'

// Fix for default markers in react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapComponent() {
  const { markers, loading, error, addMarker, deleteMarker } = useMarkers()
  const [center] = useState<[number, number]>([51.505, -0.09]) // London coordinates

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      await addMarker(lat, lng, `Marker at ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    } catch (err) {
      console.error('Failed to add marker:', err)
      alert('Failed to add marker')
    }
  }

  const handleDeleteMarker = async (id: string) => {
    try {
      await deleteMarker(id)
    } catch (err) {
      console.error('Failed to delete marker:', err)
      alert('Failed to delete marker')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading map...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Interactive Map</h2>
        <p className="text-sm text-gray-600">Click on the map to add markers</p>
        <p className="text-sm text-gray-600">Markers: {markers.length}</p>
      </div>

      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} />
        {markers.map(marker => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div>
                <h3 className="font-semibold">{marker.title}</h3>
                <p>Lat: {marker.lat.toFixed(4)}</p>
                <p>Lng: {marker.lng.toFixed(4)}</p>
                <button
                  onClick={() => handleDeleteMarker(marker.id)}
                  className="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
