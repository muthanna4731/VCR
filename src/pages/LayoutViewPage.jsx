import { useMemo, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router'
import '../css/properties.css'
import useFilters from '../hooks/useFilters'
import usePlots from '../hooks/usePlots'
import useLayoutMedia from '../hooks/useLayoutMedia'
import FilterBar from '../components/properties/FilterBar'
import SiteMap from '../components/properties/SiteMap'
import PlotChip from '../components/properties/PlotChip'
import LayoutGallery from '../components/properties/LayoutGallery'
import PlotDetailModal from '../components/properties/PlotDetailModal'
import VisitBookingModal from '../components/properties/VisitBookingModal'
import { formatPricePerSqft } from '../data/mockData'

export default function LayoutViewPage() {
  const { slug } = useParams()
  const [filters, setFilters] = useFilters()
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [docToast, setDocToast] = useState(false)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const docToastTimer = useRef(null)

  const { layout, city, plots, overlays, loading, error } = usePlots(slug)
  const { media, loading: mediaLoading } = useLayoutMedia(layout?.id)

  // All hooks must run before any conditional return
  const stats = useMemo(() => {
    if (!plots.length) return { total: 0, available: 0, minPrice: 0 }
    const available = plots.filter(p => p.status === 'available').length
    const minPrice = Math.min(...plots.map(p => p.pricePerSqft))
    return { total: plots.length, available, minPrice }
  }, [plots])

  const filterOptions = useMemo(() => ({
    facing:     [...new Set(plots.map(p => p.facing))].sort(),
    dimensions: [...new Set(plots.map(p => p.dimensions))].sort(),
    status:     [...new Set(plots.map(p => p.status))].sort(),
  }), [plots])

  const handleLegalDocs = useCallback(() => {
    if (layout?.legalDocUrl) {
      window.open(layout.legalDocUrl, '_blank', 'noopener,noreferrer')
    } else {
      setDocToast(true)
      clearTimeout(docToastTimer.current)
      docToastTimer.current = setTimeout(() => setDocToast(false), 3000)
    }
  }, [layout?.legalDocUrl])

  const plotMatchesFilter = useCallback((plot) => {
    if (filters.facing && plot.facing !== filters.facing) return false
    if (filters.dimensions && plot.dimensions !== filters.dimensions) return false
    if (filters.status && plot.status !== filters.status) return false
    return true
  }, [filters.facing, filters.dimensions, filters.status])

  const sortedPlots = useMemo(() =>
    [...plots].sort((a, b) => a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true, sensitivity: 'base' }))
  , [plots])

  // Conditional renders — after all hooks
  if (loading) {
    return (
      <div className="prop-layout-page">
        <div className="container-container">
          <div className="prop-empty">
            <div className="prop-empty-title">Loading layout…</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !layout) {
    return (
      <div className="prop-layout-page">
        <div className="container-container">
          <div className="prop-empty">
            <div className="prop-empty-title">Layout not found</div>
            <div className="prop-empty-text">
              <Link to="/properties" style={{ color: '#046ebc' }}>Back to properties</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasActiveFilters = filters.facing || filters.dimensions || filters.status

  return (
    <div className="prop-layout-page">
      <div className="container-container">
        {/* Back link */}
        <Link to="/properties" className="prop-layout-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Properties
        </Link>

        {/* Hero info */}
        <div className="prop-layout-hero">
          <h1 className="prop-layout-name">{layout.name}</h1>
          <div className="prop-layout-city">{city?.name}, {city?.state}</div>
          <div className="prop-layout-hero-row">
            <div className="prop-layout-meta">
              <span>{stats.total} plots</span>
              <span className="prop-dot"></span>
              <span className="prop-avail">{stats.available} available</span>
              {stats.minPrice > 0 && (
                <>
                  <span className="prop-dot"></span>
                  <span>Starting &#8377;{formatPricePerSqft(stats.minPrice)}</span>
                </>
              )}
            </div>
            <div className="prop-layout-hero-actions">
              <button
                className="prop-book-visit-btn"
                onClick={() => setShowVisitModal(true)}
              >
                Book a Site Visit
              </button>
              <button
                className="prop-legal-doc-btn"
                onClick={handleLegalDocs}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Legal Documents
              </button>
              {docToast && (
                <div className="prop-legal-doc-toast">
                  Documents will be available soon
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Site Map */}
        <SiteMap
          layout={layout}
          imageUrl={layout.layoutImageUrl}
          overlays={overlays}
          onOverlayClick={(overlay) => {
            const plot = plots.find(p => p.id === overlay.plotId)
            if (plot) setSelectedPlot(plot)
          }}
        />

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          options={filterOptions}
          showCopyLink={true}
        />

        {/* Plot listing */}
        <div className="prop-plot-section">
          <div className="prop-plot-chips">
            {sortedPlots.map(plot => (
              <PlotChip
                key={plot.id}
                plot={plot}
                isFilteredOut={hasActiveFilters && !plotMatchesFilter(plot)}
                onClick={setSelectedPlot}
              />
            ))}
          </div>
        </div>

        {/* Gallery */}
        <LayoutGallery media={media} loading={mediaLoading} />
      </div>

      {/* Plot Detail Modal */}
      {selectedPlot && (
        <PlotDetailModal
          plot={selectedPlot}
          layoutName={layout.name}
          cityName={city?.name}
          onClose={() => setSelectedPlot(null)}
        />
      )}

      {/* Visit Booking Modal */}
      <VisitBookingModal
        layout={layout}
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
      />
    </div>
  )
}
