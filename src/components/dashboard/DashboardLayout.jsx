import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router'
import '../../css/dashboard.css'
import Sidebar from './Sidebar'
import NetworkBanner from '../layout/NetworkBanner'

const MOBILE_NAV = [
  { to: '/admin',           label: 'Overview',  icon: 'dashboard',     end: true },
  { to: '/admin/layouts',   label: 'Layouts',   icon: 'layers' },
  { to: '/admin/plots',     label: 'Plots',     icon: 'grid_on' },
  { to: '/admin/customers', label: 'Customers', icon: 'group' },
  { to: '/admin/agents',    label: 'Agents',    icon: 'support_agent' },
  { to: '/admin/payments',  label: 'Finance',   icon: 'payments' },
  { to: '/admin/visits',    label: 'Visits',    icon: 'calendar_month' },
  { to: '/admin/documents', label: 'Docs',      icon: 'description' },
]

const PAGE_TITLES = {
  '/admin':           'Main Dashboard',
  '/admin/layouts':   'Layouts',
  '/admin/plots':     'Plots',
  '/admin/customers': 'Customers',
  '/admin/agents':    'Agents',
  '/admin/payments':  'Payments',
  '/admin/documents': 'Documents',
  '/admin/visits':    'Visits',
  '/admin/updates':   'Updates',
}

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const bottomNavRef = useRef(null)
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard'

  useEffect(() => {
    const nav = bottomNavRef.current
    if (!nav) return

    const activeItem = nav.querySelector('.dash-bottomnav-item--active')
    if (!activeItem) return

    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [location.pathname])

  return (
    <div className="dash-shell">
      <NetworkBanner />
      {/* Mobile top bar */}
      <div className="dash-mobile-topbar">
        <div className="dash-mobile-topbar-brand">
          <span className="dash-mobile-topbar-name">RealEstateOS</span>
          <span className="dash-mobile-topbar-sub">VCR Builders</span>
        </div>
        <div className="dash-mobile-topbar-actions">
          <button
            className="dash-mobile-topbar-refresh"
            onClick={() => navigate('/admin/updates')}
            aria-label="Updates"
            title="Updates & Remarks"
          >
            <span className="material-symbols-outlined">chat_bubble</span>
          </button>
          <button
            className="dash-mobile-topbar-refresh"
            onClick={() => window.location.reload()}
            aria-label="Refresh"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="dash-main">
        {/* Desktop top bar */}
        <header className="dash-topbar">
          <span className="dash-topbar-label">{pageTitle}</span>
          <div className="dash-topbar-actions">
            <button
              className="dash-topbar-icon-btn"
              aria-label="Updates"
              title="Updates & Remarks"
              onClick={() => navigate('/admin/updates')}
            >
              <span className="material-symbols-outlined">chat_bubble</span>
            </button>
            <button className="dash-topbar-icon-btn" aria-label="Refresh" onClick={() => window.location.reload()}>
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </header>

        <Outlet />
      </div>

      {/* Mobile bottom nav */}
      <nav ref={bottomNavRef} className="dash-bottomnav" aria-label="Mobile navigation">
        {MOBILE_NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `dash-bottomnav-item${isActive ? ' dash-bottomnav-item--active' : ''}`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="dash-bottomnav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
