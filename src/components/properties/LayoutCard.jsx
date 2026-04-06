import { Link } from 'react-router'
import { formatPricePerSqft } from '../../data/mockData'

export default function LayoutCard({ layout }) {
  const stats = layout.stats || { total: 0, available: 0, minPrice: 0 }
  const city = layout.city

  return (
    <Link to={`/properties/${layout.slug}`} className="prop-layout-card">
      <div className="prop-layout-card-image">
        {layout.cardImageUrl ? (
          <img src={layout.cardImageUrl} alt={layout.name} loading="lazy" />
        ) : (
          <div className="prop-layout-card-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            <span>Site Plan</span>
          </div>
        )}
      </div>
      <div className="prop-layout-card-body">
        <div className="prop-layout-card-name">{layout.name}</div>
        <div className="prop-layout-card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {city?.name}, {city?.state}
        </div>
        <div className="prop-layout-card-stats">
          <span>{stats.total} plots</span>
          <span className="prop-dot"></span>
          <span className="prop-layout-card-avail">{stats.available} available</span>
        </div>
        {stats.minPrice > 0 && (
          <div className="prop-layout-card-price">
            Starting &#8377;{formatPricePerSqft(stats.minPrice)}
          </div>
        )}
      </div>
    </Link>
  )
}
