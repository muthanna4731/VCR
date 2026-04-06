import { useState, useCallback } from 'react'

export default function FilterBar({ filters, onFilterChange, options, showCopyLink }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleChange = useCallback((key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }, [filters, onFilterChange])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setCopyError(false)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        setCopyError(true)
        setCopied(false)
      })
  }, [])

  return (
    <div className="prop-filter-bar">
      {options.city && (
        <select
          className="prop-filter-select"
          aria-label="Filter by city"
          value={filters.city || ''}
          onChange={e => handleChange('city', e.target.value)}
        >
          <option value="">All Cities</option>
          {options.city.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      {options.facing && (
        <select
          className="prop-filter-select"
          aria-label="Filter by facing"
          value={filters.facing || ''}
          onChange={e => handleChange('facing', e.target.value)}
        >
          <option value="">All Facings</option>
          {options.facing.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      )}

      {options.dimensions && (
        <select
          className="prop-filter-select"
          aria-label="Filter by dimensions"
          value={filters.dimensions || ''}
          onChange={e => handleChange('dimensions', e.target.value)}
        >
          <option value="">All Dimensions</option>
          {options.dimensions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )}

      {options.status && (
        <select
          className="prop-filter-select"
          aria-label="Filter by status"
          value={filters.status || ''}
          onChange={e => handleChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {options.status.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {showCopyLink && (
        <button
          className={`prop-filter-copy-btn${copied ? ' prop-copied' : ''}`}
          onClick={handleCopyLink}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {copied ? 'Copied!' : copyError ? 'Copy unavailable' : 'Copy Link'}
        </button>
      )}
    </div>
  )
}
