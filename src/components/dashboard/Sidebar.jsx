import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/admin',           label: 'Overview',  icon: 'grid_view',    end: true },
  { to: '/admin/layouts',   label: 'Layouts',   icon: 'layers' },
  { to: '/admin/plots',     label: 'Plots',     icon: 'grid_on' },
  { to: '/admin/customers', label: 'Customers', icon: 'group' },
  { to: '/admin/agents',    label: 'Agents',    icon: 'support_agent' },
  { to: '/admin/payments',  label: 'Payments',  icon: 'payments' },
  { to: '/admin/visits',    label: 'Visits',    icon: 'calendar_month' },
  { to: '/admin/documents', label: 'Documents', icon: 'description' },
]

export default function Sidebar() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A'

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-brand">
        <h1 className="dash-sidebar-brand-title">RealEstateOS</h1>
        <p className="dash-sidebar-brand-sub">VCR Builders</p>
      </div>

      <nav className="dash-sidebar-nav" aria-label="Dashboard navigation">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `dash-sidebar-link${isActive ? ' dash-sidebar-link--active' : ''}`
            }
          >
            <span className="material-symbols-outlined dash-sidebar-icon">{item.icon}</span>
            <span className="dash-sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="dash-sidebar-footer">
        <a
          href="/"
          className="dash-sidebar-view-site"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>open_in_new</span>
          View Site
        </a>
        <div className="dash-sidebar-profile">
          <div className="dash-sidebar-avatar">{initials}</div>
          <div className="dash-sidebar-profile-info">
            <span className="dash-sidebar-profile-name">{profile?.full_name ?? 'Admin'}</span>
            <span className="dash-sidebar-profile-role">Administrator</span>
          </div>
          <button className="dash-sidebar-signout-icon" onClick={handleSignOut} title="Sign out">
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
