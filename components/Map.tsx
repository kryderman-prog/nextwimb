'use client'

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { motion } from 'framer-motion'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const KOCHI_LOCATION: [number, number] = [9.9312, 76.2673]

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, 13)
    // Fix for map not rendering properly
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }, [center, map])

  return null
}

export default function MapComponent() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    let mounted = true

    const getLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!mounted) return
            const { latitude, longitude } = position.coords
            setUserLocation([latitude, longitude])
            setLoading(false)
          },
          (error) => {
            if (!mounted) return
            console.warn('Geolocation error:', error)
            // Fallback to Kochi
            setUserLocation(KOCHI_LOCATION)
            setLoading(false)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      } else {
        // Geolocation not supported, use Kochi
        setUserLocation(KOCHI_LOCATION)
        setLoading(false)
      }
    }

    getLocation()

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-color">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-color mx-auto mb-4"></div>
          <p className="text-primary-color font-medium">Loading map...</p>
        </motion.div>
      </div>
    )
  }

  if (!userLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-color">
        <div className="text-red-500 text-center">
          <p>Unable to load map</p>
          <p>Please check your location permissions</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full relative"
    >
      <MapContainer
        center={userLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={userLocation} />

        <Marker position={userLocation}>
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold text-primary-color">You are here!</h3>
              <p className="text-sm text-gray-600">
                Lat: {userLocation[0].toFixed(4)}<br />
                Lng: {userLocation[1].toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 left-4 glassmorphism p-4 rounded-xl shadow-lg"
      >
        <h3 className="font-semibold text-primary-color mb-2">Your Location</h3>
        <p className="text-sm text-gray-600">
          {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
        </p>
      </motion.div>
    </motion.div>
  )
}
