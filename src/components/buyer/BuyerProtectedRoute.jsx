import { Navigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'

export default function BuyerProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="buyer-loading">
        <div className="buyer-spinner" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile?.role !== 'buyer') {
    return <Navigate to="/admin" replace />
  }

  return children
}
