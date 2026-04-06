import { useState } from 'react'
import LayoutCard from './LayoutCard'

export default function CitySection({ city, layouts }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="prop-city-section">
      <button
        className="prop-city-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="prop-city-name">{city.name}</span>
        <span className="prop-city-count">
          {layouts.length} layout{layouts.length !== 1 ? 's' : ''}
        </span>
        <div className={`prop-city-toggle${expanded ? '' : ' prop-collapsed'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#151717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="prop-layout-grid">
          {layouts.map(layout => (
            <LayoutCard key={layout.id} layout={layout} />
          ))}
        </div>
      )}
    </div>
  )
}
