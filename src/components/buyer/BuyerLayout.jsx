import { Outlet, NavLink } from 'react-router'
import '../../css/buyer-portal.css'
import { useAuth } from '../../hooks/useAuth'
import NetworkBanner from '../layout/NetworkBanner'

export default function BuyerLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="buyer-shell">
      <NetworkBanner />
      <nav className="buyer-nav">
        <div className="buyer-nav-inner">
          <div className="buyer-nav-brand">VCR</div>
          <div className="buyer-nav-links">
            <NavLink to="/my" end className="buyer-nav-link">Overview</NavLink>
            <NavLink to="/my/plot" className="buyer-nav-link">My Plot</NavLink>
            <NavLink to="/my/documents" className="buyer-nav-link">Documents</NavLink>
            <NavLink to="/my/visits" className="buyer-nav-link">Site Visits</NavLink>
          </div>
          <div className="buyer-nav-actions">
            {profile?.full_name && (
              <span className="buyer-nav-user">{profile.full_name}</span>
            )}
            <button className="buyer-nav-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <div className="buyer-main">
        <Outlet />
      </div>
    </div>
  )
}
