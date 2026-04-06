import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { STATUS_COLORS, STATUS_LABELS, AMENITY_LABELS, formatPrice, formatPricePerSqft } from '../../data/mockData'
import EnquiryForm from './EnquiryForm'

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function PlotDetailModal({ plot, layoutName, cityName, onClose }) {
  const contentRef = useRef(null)
  const previousFocusRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab' || !contentRef.current) return

    const focusable = [...contentRef.current.querySelectorAll(FOCUSABLE)]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    // Focus close button on open
    const closeBtn = contentRef.current?.querySelector('.prop-modal-close')
    if (closeBtn) closeBtn.focus()

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [handleKeyDown])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return createPortal(
    <div className="prop-modal-overlay" onClick={handleOverlayClick}>
      <div className="prop-modal-content" ref={contentRef}>
        <button className="prop-modal-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="prop-modal-header">
          <div className="prop-modal-plot-number">Plot {plot.plotNumber}</div>
          <div className="prop-modal-layout-name">{layoutName} &middot; {cityName}</div>
        </div>

        <div className="prop-modal-body">
          <div className="prop-modal-details">
            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Dimensions</span>
              <span className="prop-modal-detail-value">
                {plot.dimensions} ft ({plot.dimensionSqft.toLocaleString('en-IN')} sqft)
              </span>
            </div>

            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Facing</span>
              <span className="prop-modal-detail-value">{plot.facing}</span>
            </div>

            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Status</span>
              <span className="prop-modal-detail-value">
                <span className="prop-modal-status-badge">
                  <span
                    className="prop-modal-status-dot"
                    style={{ backgroundColor: STATUS_COLORS[plot.status] }}
                  ></span>
                  {STATUS_LABELS[plot.status]}
                </span>
              </span>
            </div>

            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Road Width</span>
              <span className="prop-modal-detail-value">{plot.roadWidth}</span>
            </div>

            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Corner Plot</span>
              <span className="prop-modal-detail-value">{plot.cornerPlot ? 'Yes' : 'No'}</span>
            </div>

            <div className="prop-modal-detail">
              <span className="prop-modal-detail-label">Price</span>
              <span className="prop-modal-detail-value prop-price">
                &#8377;{formatPrice(plot.totalPrice)} (&#8377;{formatPricePerSqft(plot.pricePerSqft)})
              </span>
            </div>
          </div>

          {plot.amenities.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <span className="prop-modal-detail-label" style={{ marginBottom: '0.8rem', display: 'block' }}>Amenities</span>
              <div className="prop-modal-amenities">
                {plot.amenities.map(a => (
                  <span key={a} className="prop-modal-amenity">
                    {AMENITY_LABELS[a] || a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plot.status === 'available' && (
            <EnquiryForm plotId={plot.id} layoutId={plot.layoutId} />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
