import { Navigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'

function isStaffRole(role) {
  return ['admin', 'owner', 'manager'].includes(role)
}

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="dash-loading-screen">
        <div className="dash-loading-spinner" />
      </div>
    )
  }

  if (!user || !isStaffRole(profile?.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}
