import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { homeForRole } from '../lib/appRoutes'
import '../css/dashboard.css'

/**
 * /app — the one address for the app (and the installed PWA's start_url).
 * Sends each signed-in user to their own portal and everyone else to sign in.
 */
export default function AppEntryPage() {
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    document.title = 'VCR App'
  }, [])

  if (loading) {
    return (
      <div className="dash-loading-screen">
        <div className="dash-loading-spinner" />
      </div>
    )
  }

  const home = user ? homeForRole(profile?.role) : null
  return <Navigate to={home ?? '/login'} replace />
}
