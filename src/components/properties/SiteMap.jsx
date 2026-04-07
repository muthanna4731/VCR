import { useCallback, useRef, useEffect, useState } from 'react'
import { STATUS_COLORS, STATUS_LABELS } from '../../data/mockData'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 1.3

function toSvgPoints(coords) {
  return coords.map(p => `${p.x},${p.y}`).join(' ')
}

export default function SiteMap({ layout, imageUrl, overlays = [], onOverlayClick }) {
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const outerRef = useRef(null)
  const isDragging = useRef(false)
  const dragLast = useRef(null)
  const lastPinchDist = useRef(null)

  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    resetView()
  }, [layout.id, resetView])

  // Mouse wheel zoom — non-passive to preventDefault
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setZoom(prev => {
        const next = clampZoom(prev * factor)
        if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Touch events — non-passive for pinch/pan
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.hypot(dx, dy)
        isDragging.current = false
      } else if (e.touches.length === 1) {
        setZoom(currentZoom => {
          if (currentZoom > 1) {
            isDragging.current = true
            dragLast.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }
          return currentZoom
        })
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchDist.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const factor = dist / lastPinchDist.current
        setZoom(prev => {
          const next = clampZoom(prev * factor)
          if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
          return next
        })
        lastPinchDist.current = dist
      } else if (e.touches.length === 1 && isDragging.current && dragLast.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - dragLast.current.x
        const dy = e.touches[0].clientY - dragLast.current.y
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        dragLast.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) lastPinchDist.current = null
      if (e.touches.length === 0) {
        isDragging.current = false
        dragLast.current = null
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return
    e.preventDefault()
    isDragging.current = true
    dragLast.current = { x: e.clientX, y: e.clientY }
    outerRef.current?.setAttribute('data-dragging', 'true')
  }, [zoom])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !dragLast.current) return
    const dx = e.clientX - dragLast.current.x
    const dy = e.clientY - dragLast.current.y
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    dragLast.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    dragLast.current = null
    outerRef.current?.removeAttribute('data-dragging')
  }, [])

  const zoomIn = () => setZoom(prev => clampZoom(prev * ZOOM_STEP))
  const zoomOut = () => setZoom(prev => {
    const next = clampZoom(prev / ZOOM_STEP)
    if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
    return next
  })

  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
  }



  function handleOverlayClick(e, overlay) {
    e.stopPropagation()
    onOverlayClick?.(overlay)
  }

  const zoomControls = (
    <div className="prop-sitemap-zoom-controls">
      <button
        className="prop-sitemap-zoom-btn"
        onClick={zoomIn}
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span className="prop-sitemap-zoom-level">{Math.round(zoom * 100)}%</span>
      <button
        className="prop-sitemap-zoom-btn"
        onClick={zoomOut}
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {zoom > 1 && (
        <button
          className="prop-sitemap-zoom-btn prop-sitemap-zoom-reset"
          onClick={resetView}
          aria-label="Reset zoom"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </div>
  )

  return (
    <div className="prop-sitemap-wrapper">
      {imageUrl ? (
        <div
          ref={outerRef}
          className="prop-sitemap-outer"
          style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="prop-sitemap-interactive" style={transformStyle}>
            <div className="prop-sitemap-inner">
            <img
              src={imageUrl}
              alt={`${layout.name} site plan`}
              className="prop-sitemap-image"
              draggable="false"
            />

            {/* Overlay polygons */}
            {overlays.length > 0 && (
              <svg
                className="prop-sitemap-overlay-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {overlays.map(overlay => (
                  <g
                    key={overlay.id}
                    onClick={e => handleOverlayClick(e, overlay)}
                    style={{ cursor: 'pointer' }}
                  >
                    <polygon
                      points={toSvgPoints(overlay.coordinates)}
                      fill={STATUS_COLORS[overlay.plotStatus] + '55'}
                      stroke={STATUS_COLORS[overlay.plotStatus]}
                      strokeWidth={0.18}
                      strokeLinejoin="round"
                    />
                    {overlay.labelPosition && (
                      <text
                        x={overlay.labelPosition.x}
                        y={overlay.labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={2.2}
                        fontWeight="600"
                        fontFamily="'Instrument Sans', 'Instrument Sans Fallback', sans-serif"
                        fill="#ffffff"
                        stroke="rgb(0, 26, 32)"
                        strokeWidth={0.4}
                        strokeLinejoin="round"
                        paintOrder="stroke fill"
                        letterSpacing="-0.03em"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {overlay.plotNumber}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}

            </div>

          </div>
          {zoomControls}
        </div>
      ) : (
        <div className="prop-sitemap-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="22" height="22" rx="2" />
            <line x1="1" y1="8" x2="23" y2="8" />
            <line x1="1" y1="16" x2="23" y2="16" />
            <line x1="8" y1="1" x2="8" y2="23" />
            <line x1="16" y1="1" x2="16" y2="23" />
          </svg>
          <span>Site plan not uploaded yet</span>
        </div>
      )}

      <div className="prop-sitemap-legend">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="prop-sitemap-legend-item">
            <span
              className="prop-sitemap-legend-dot"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            ></span>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
