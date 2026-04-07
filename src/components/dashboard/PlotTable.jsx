import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { supabase } from '../../lib/supabase'
import { STATUS_COLORS, STATUS_LABELS, formatPrice } from '../../data/mockData'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const MAP_MIN_ZOOM = 1
const MAP_MAX_ZOOM = 4
const MAP_ZOOM_STEP = 1.3

const STATUSES = ['available', 'negotiation', 'booked', 'sold', 'blocked']
const FACINGS = ['North', 'East', 'South', 'West']

function mapPlot(row) {
  return {
    id: row.id,
    layoutId: row.layout_id,
    plotNumber: row.plot_number,
    dimensions: row.dimensions,
    dimensionSqft: row.dimension_sqft,
    facing: row.facing,
    status: row.status,
    pricePerSqft: row.price_per_sqft,
    totalPrice: row.total_price,
    cornerPlot: row.corner_plot,
    roadWidth: row.road_width ?? '',
    amenities: row.amenities ?? [],
    layoutName: row.site_layouts?.name ?? '—',
    cityName: row.site_layouts?.cities?.name ?? '—',
  }
}

export default function PlotTable() {
  const navigate = useNavigate()
  const location = useLocation()

  const [plots, setPlots] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Read ?layout= from URL on mount
  const initialLayout = new URLSearchParams(location.search).get('layout') ?? ''
  const [filterLayout, setFilterLayout] = useState(initialLayout)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFacing, setFilterFacing] = useState('')

  const [selected, setSelected] = useState(new Set())
  const lastClickedIdx = useRef(null)
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkFacing, setBulkFacing] = useState('')
  const [bulkDimensions, setBulkDimensions] = useState('')
  const [bulkPricePerSqft, setBulkPricePerSqft] = useState('')
  const [bulkRoadWidth, setBulkRoadWidth] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [editingStatusId, setEditingStatusId] = useState(null)

  // Layout image + overlay state
  const [layoutImageUrl, setLayoutImageUrl] = useState(null)
  const [overlays, setOverlays] = useState([])
  const [selectedOverlayId, setSelectedOverlayId] = useState(null)

  // Zoom/pan
  const [mapZoom, setMapZoom] = useState(MAP_MIN_ZOOM)
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 })
  const outerRef = useRef(null)
  const isPanningMap = useRef(false)
  const panLast = useRef(null)

  // Payment info for popup
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentInfoLoading, setPaymentInfoLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())

    try {
      const [plotsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('plots')
            .select('id, layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities, site_layouts(name, cities(name))')
            .order('plot_number'),
          { label: 'Load plot table' }
        ),
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, name, layout_image_url').order('name'),
          { label: 'Load plot table layouts' }
        ),
      ])
      setPlots(plotsRes.data.map(mapPlot))
      setLayouts(layoutsRes.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Update layout image when filter changes
  useEffect(() => {
    if (!filterLayout || layouts.length === 0) {
      setLayoutImageUrl(null)
      setOverlays([])
      setSelectedOverlayId(null)
      return
    }
    const found = layouts.find(l => l.id === filterLayout)
    setLayoutImageUrl(found?.layout_image_url ?? null)
  }, [filterLayout, layouts])

  // Fetch overlays whenever a layout is selected
  useEffect(() => {
    if (!filterLayout) return undefined

    let cancelled = false
    setSelectedOverlayId(null)

    async function loadOverlays() {
      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('plot_overlays')
            .select('id, plot_id, coordinates, label_position, plots(plot_number)')
            .eq('layout_id', filterLayout),
          { label: 'Load plot overlays for table' }
        )

        if (!cancelled) {
          setOverlays((data ?? []).map(row => ({
            id: row.id,
            plotId: row.plot_id,
            coordinates: row.coordinates,
            labelPosition: row.label_position,
            plotNumber: row.plots?.plot_number ?? '',
          })))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    loadOverlays()

    return () => {
      cancelled = true
    }
  }, [filterLayout])

  // Reset zoom when layout changes
  useEffect(() => {
    setMapZoom(MAP_MIN_ZOOM)
    setMapPan({ x: 0, y: 0 })
  }, [filterLayout])

  // Mouse-wheel zoom — non-passive
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setMapZoom(prev => {
        const next = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, prev * factor))
        if (next <= MAP_MIN_ZOOM) setMapPan({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [filterLayout]) // re-bind when layout section mounts/unmounts

  // Fetch payment info for selected plot
  useEffect(() => {
    if (!selectedOverlayId) { setPaymentInfo(null); return }
    const ov = overlays.find(o => o.id === selectedOverlayId)
    if (!ov?.plotId) { setPaymentInfo(null); return }

    let cancelled = false
    setPaymentInfoLoading(true)

    async function fetchPayment() {
      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('id, buyer_name, buyer_phone, total_amount, payment_installments(id, status, amount)')
            .eq('plot_id', ov.plotId)
            .maybeSingle(),
          { label: 'Fetch payment info for plot panel' }
        )
        if (!cancelled) setPaymentInfo(data ?? null)
      } catch {
        if (!cancelled) setPaymentInfo(null)
      } finally {
        if (!cancelled) setPaymentInfoLoading(false)
      }
    }
    fetchPayment()
    return () => { cancelled = true }
  }, [selectedOverlayId, overlays])

  const filtered = plots
    .filter(p => {
      if (filterLayout && p.layoutId !== filterLayout) return false
      if (filterStatus && p.status !== filterStatus) return false
      if (filterFacing && p.facing !== filterFacing) return false
      return true
    })
    .sort((a, b) => {
      const layoutCmp = a.layoutName.localeCompare(b.layoutName)
      if (layoutCmp !== 0) return layoutCmp
      return a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true, sensitivity: 'base' })
    })

  function toggleSelect(id, e) {
    const idx = filtered.findIndex(p => p.id === id)

    if (e?.shiftKey && lastClickedIdx.current !== null && lastClickedIdx.current !== idx) {
      // Shift+click: select the range between last click and this click
      const from = Math.min(lastClickedIdx.current, idx)
      const to = Math.max(lastClickedIdx.current, idx)
      setSelected(prev => {
        const next = new Set(prev)
        for (let i = from; i <= to; i++) next.add(filtered[i].id)
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    lastClickedIdx.current = idx
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
  }

  async function applyBulkUpdate() {
    if (selected.size === 0) return

    // Build the update payload from non-empty fields
    const updatePayload = {}
    const localUpdates = {}

    if (bulkStatus) {
      updatePayload.status = bulkStatus
      localUpdates.status = bulkStatus
    }
    if (bulkFacing) {
      updatePayload.facing = bulkFacing
      localUpdates.facing = bulkFacing
    }
    if (bulkDimensions.trim()) {
      updatePayload.dimensions = bulkDimensions.trim()
      localUpdates.dimensions = bulkDimensions.trim()
    }
    if (bulkPricePerSqft) {
      const pps = parseInt(bulkPricePerSqft, 10) || 0
      updatePayload.price_per_sqft = pps
      localUpdates.pricePerSqft = pps
    }
    if (bulkRoadWidth.trim()) {
      updatePayload.road_width = bulkRoadWidth.trim()
      localUpdates.roadWidth = bulkRoadWidth.trim()
    }

    if (Object.keys(updatePayload).length === 0) return

    setApplyingBulk(true)
    const ids = [...selected]

    try {
      await runSupabaseMutation(
        () => supabase
          .from('plots')
          .update(updatePayload)
          .in('id', ids),
        { label: 'Apply bulk plot update' }
      )

      // Recalculate total price if price_per_sqft changed
      setPlots(prev =>
        prev.map(p => {
          if (!selected.has(p.id)) return p
          const updated = { ...p, ...localUpdates }
          if (localUpdates.pricePerSqft !== undefined) {
            updated.totalPrice = updated.dimensionSqft * updated.pricePerSqft
          }
          return updated
        })
      )
      setSelected(new Set())
      setBulkStatus('')
      setBulkFacing('')
      setBulkDimensions('')
      setBulkPricePerSqft('')
      setBulkRoadWidth('')
    } catch (err) {
      setError(err.message)
    }
    setApplyingBulk(false)
  }

  async function updateStatus(plotId, newStatus) {
    setEditingStatusId(null)
    try {
      await runSupabaseMutation(
        () => supabase
          .from('plots')
          .update({ status: newStatus })
          .eq('id', plotId),
        { label: 'Update plot status' }
      )
      setPlots(prev =>
        prev.map(p => p.id === plotId ? { ...p, status: newStatus } : p)
      )
    } catch (err) {
      setError(err.message)
    }
  }

  const activeLayoutName = layouts.find(l => l.id === filterLayout)?.name ?? ''

  function toScaledSvgPoints(coords) {
    return coords.map(p => `${p.x},${p.y}`).join(' ')
  }

  function handleMapMouseDown(e) {
    if (mapZoom > MAP_MIN_ZOOM) {
      isPanningMap.current = true
      panLast.current = { x: e.clientX, y: e.clientY }
      outerRef.current?.setAttribute('data-panning', 'true')
    }
  }

  function handleMapMouseMove(e) {
    if (!isPanningMap.current || !panLast.current) return
    const dx = e.clientX - panLast.current.x
    const dy = e.clientY - panLast.current.y
    setMapPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    panLast.current = { x: e.clientX, y: e.clientY }
  }

  function handleMapMouseUp() {
    isPanningMap.current = false
    panLast.current = null
    outerRef.current?.removeAttribute('data-panning')
  }

  const mapZoomIn = () => setMapZoom(prev => Math.min(MAP_MAX_ZOOM, prev * MAP_ZOOM_STEP))
  const mapZoomOut = () => setMapZoom(prev => {
    const next = Math.max(MAP_MIN_ZOOM, prev / MAP_ZOOM_STEP)
    if (next <= MAP_MIN_ZOOM) setMapPan({ x: 0, y: 0 })
    return next
  })
  const resetMapView = () => { setMapZoom(MAP_MIN_ZOOM); setMapPan({ x: 0, y: 0 }) }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">
          {activeLayoutName ? `${activeLayoutName} — Plots` : 'Plots'}
        </h1>
        <span className="dash-page-count">{filtered.length} of {plots.length} plots</span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-filter-bar">
        <select
          className="dash-filter-select"
          value={filterLayout}
          onChange={e => { setFilterLayout(e.target.value); setSelected(new Set()) }}
        >
          <option value="">All Layouts</option>
          {layouts.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          className="dash-filter-select"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setSelected(new Set()) }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          className="dash-filter-select"
          value={filterFacing}
          onChange={e => { setFilterFacing(e.target.value); setSelected(new Set()) }}
        >
          <option value="">All Facings</option>
          {FACINGS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {(filterLayout || filterStatus || filterFacing) && (
          <button
            className="dash-btn dash-btn--ghost dash-btn--sm"
            onClick={() => { setFilterLayout(''); setFilterStatus(''); setFilterFacing(''); setSelected(new Set()) }}
          >
            Clear
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="dash-bulk-bar" style={{ flexWrap: 'wrap' }}>
          <span className="dash-bulk-count">{selected.size} selected</span>
          <select
            className="dash-filter-select"
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
          >
            <option value="">Status…</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className="dash-filter-select"
            value={bulkFacing}
            onChange={e => setBulkFacing(e.target.value)}
          >
            <option value="">Facing…</option>
            {FACINGS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input
            type="text"
            className="dash-filter-select"
            value={bulkDimensions}
            onChange={e => setBulkDimensions(e.target.value)}
            placeholder="Dimensions…"
            style={{ width: '12rem' }}
          />
          <input
            type="number"
            className="dash-filter-select"
            value={bulkPricePerSqft}
            onChange={e => setBulkPricePerSqft(e.target.value)}
            placeholder="Price/sqft…"
            min="0"
            style={{ width: '12rem' }}
          />
          <input
            type="text"
            className="dash-filter-select"
            value={bulkRoadWidth}
            onChange={e => setBulkRoadWidth(e.target.value)}
            placeholder="Road width…"
            style={{ width: '12rem' }}
          />
          <button
            className="dash-btn dash-btn--primary dash-btn--sm"
            onClick={applyBulkUpdate}
            disabled={(!bulkStatus && !bulkFacing && !bulkDimensions.trim() && !bulkPricePerSqft && !bulkRoadWidth.trim()) || applyingBulk}
          >
            {applyingBulk ? 'Applying…' : 'Apply'}
          </button>
          <button
            className="dash-btn dash-btn--ghost dash-btn--sm"
            onClick={() => setSelected(new Set())}
          >
            Deselect
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="dash-empty">No plots match the current filters.</p>
      ) : (
        <div className="dash-table-wrap dash-table-wrap--scroll">
          <table className="dash-table dash-table--plots">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Plot</th>
                <th>Layout</th>
                <th>Facing</th>
                <th>Dimensions</th>
                <th>Status</th>
                <th>Price/sqft</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(plot => (
                <tr
                  key={plot.id}
                  className={`dash-table-row${selected.has(plot.id) ? ' dash-table-row--selected' : ''}`}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(plot.id)}
                      onChange={e => toggleSelect(plot.id, e.nativeEvent)}
                      aria-label={`Select ${plot.plotNumber}`}
                    />
                  </td>
                  <td>
                    <span className="dash-table-name">{plot.plotNumber}</span>
                    {plot.cornerPlot && <span className="dash-badge dash-badge--corner">Corner</span>}
                  </td>
                  <td>
                    <div className="dash-table-name">{plot.layoutName}</div>
                    <div className="dash-table-sub">{plot.cityName}</div>
                  </td>
                  <td>{plot.facing}</td>
                  <td>
                    <div>{plot.dimensions} ft</div>
                    <div className="dash-table-sub">{plot.dimensionSqft.toLocaleString('en-IN')} sqft</div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {editingStatusId === plot.id ? (
                      <select
                        className="dash-filter-select dash-filter-select--inline"
                        defaultValue={plot.status}
                        autoFocus
                        onBlur={() => setEditingStatusId(null)}
                        onChange={e => updateStatus(plot.id, e.target.value)}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        className="dash-status-btn"
                        style={{ '--status-color': STATUS_COLORS[plot.status] }}
                        onClick={() => setEditingStatusId(plot.id)}
                        title="Click to change status"
                      >
                        <span
                          className="dash-status-dot"
                          style={{ backgroundColor: STATUS_COLORS[plot.status] }}
                        />
                        {STATUS_LABELS[plot.status]}
                      </button>
                    )}
                  </td>
                  <td>₹{plot.pricePerSqft.toLocaleString('en-IN')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="dash-btn dash-btn--sm dash-btn--ghost"
                      onClick={() => navigate(`/admin/plots/${plot.id}`)}
                      title="Edit plot"
                      aria-label={`Edit plot ${plot.plotNumber}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', verticalAlign: 'middle' }}>edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Layout site plan (shown when a layout filter is active) ── */}
      {filterLayout && (
        <div className="dash-layout-image-panel">
          <h3 className="dash-layout-image-panel-title">
            {activeLayoutName} — Site Plan
          </h3>

          {layoutImageUrl ? (
            <>
              {/* Zoom/pan canvas */}
              <div
                ref={outerRef}
                className="dash-overlay-outer"
                style={{ cursor: mapZoom > 1 ? 'grab' : 'default' }}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={handleMapMouseUp}
                onMouseLeave={handleMapMouseUp}
              >
                <div
                  className="dash-overlay-interactive"
                  style={{
                    transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <div className="dash-overlay-inner">
                    <img
                      src={layoutImageUrl}
                      alt={`${activeLayoutName} site plan`}
                      className="dash-overlay-image"
                      draggable={false}
                    />
                    {overlays.length > 0 && (
                      <svg
                        className="dash-overlay-svg"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        {overlays.map(ov => {
                          const plot = plots.find(p => p.id === ov.plotId)
                          const colour = STATUS_COLORS[plot?.status ?? 'available'] ?? '#8e8e93'
                          const isSelected = selectedOverlayId === ov.id
                          return (
                            <g
                              key={ov.id}
                              style={{ cursor: 'pointer' }}
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedOverlayId(isSelected ? null : ov.id)
                              }}
                            >
                              <polygon
                                points={toScaledSvgPoints(ov.coordinates)}
                                fill={colour + (isSelected ? '88' : '55')}
                                stroke={isSelected ? '#046ebc' : colour}
                                strokeWidth={isSelected ? 0.25 : 0.18}
                                strokeLinejoin="round"
                              />
                              {ov.labelPosition && (
                                <text
                                  x={ov.labelPosition.x}
                                  y={ov.labelPosition.y}
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
                                  {ov.plotNumber}
                                </text>
                              )}
                            </g>
                          )
                        })}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Zoom controls */}
                <div className="dash-overlay-zoom-controls">
                  <button className="dash-overlay-zoom-btn" onClick={mapZoomIn} aria-label="Zoom in" disabled={mapZoom >= MAP_MAX_ZOOM}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="dash-overlay-zoom-level">{Math.round(mapZoom * 100)}%</span>
                  <button className="dash-overlay-zoom-btn" onClick={mapZoomOut} aria-label="Zoom out" disabled={mapZoom <= MAP_MIN_ZOOM}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {mapZoom > MAP_MIN_ZOOM && (
                    <button className="dash-overlay-zoom-btn dash-overlay-zoom-reset" onClick={resetMapView} aria-label="Reset zoom">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Status legend */}
              <div className="dash-overlay-status-legend">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="dash-overlay-status-legend-item">
                    <span className="dash-overlay-status-legend-dot" style={{ backgroundColor: STATUS_COLORS[key] }} />
                    {label}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="dash-layout-image-empty">
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'rgba(0,0,0,0.15)' }}>map</span>
              <p>No site plan uploaded for this layout.</p>
              <a href="/admin/layouts" style={{ color: 'var(--dash-primary)', fontSize: '1.3rem' }}>
                Upload one in Layouts →
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Selected plot popup ── */}
      {selectedOverlayId && filterLayout && (() => {
        const ov = overlays.find(o => o.id === selectedOverlayId)
        const plot = plots.find(p => p.id === ov?.plotId)
        if (!ov || !plot) return null
        const colour = STATUS_COLORS[plot.status] ?? '#8e8e93'
        const installments = paymentInfo?.payment_installments ?? []
        const paidCount = installments.filter(i => i.status === 'paid').length
        const paidAmount = installments.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
        const totalAmount = Number(paymentInfo?.total_amount ?? 0)
        const progressPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

        return (
          <div className="dash-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedOverlayId(null) }}>
            <div className="dash-overlay-popup">
              <button className="dash-modal-close" onClick={() => setSelectedOverlayId(null)} aria-label="Close">✕</button>

              {/* Header */}
              <div className="dash-overlay-popup-header">
                <div className="dash-overlay-popup-plot">Plot {ov.plotNumber}</div>
                <span className="dash-overlay-popup-status">
                  <span className="dash-status-dot" style={{ backgroundColor: colour }} />
                  {STATUS_LABELS[plot.status]}
                </span>
              </div>

              {/* Plot info */}
              <div className="dash-overlay-popup-body">
                <div className="dash-overlay-popup-row">
                  <span className="dash-overlay-popup-label">Dimensions</span>
                  <span className="dash-overlay-popup-value">{plot.dimensions} ft · {plot.dimensionSqft?.toLocaleString('en-IN')} sqft</span>
                </div>
                <div className="dash-overlay-popup-row">
                  <span className="dash-overlay-popup-label">Facing</span>
                  <span className="dash-overlay-popup-value">{plot.facing}</span>
                </div>
                <div className="dash-overlay-popup-row">
                  <span className="dash-overlay-popup-label">Price</span>
                  <span className="dash-overlay-popup-value">&#8377;{plot.pricePerSqft?.toLocaleString('en-IN')}/sqft</span>
                </div>

                {/* Payment info */}
                {paymentInfoLoading ? (
                  <p className="dash-overlay-popup-hint" style={{ marginTop: '1rem' }}>Loading owner info…</p>
                ) : paymentInfo ? (
                  <>
                    <div className="dash-overlay-popup-row">
                      <span className="dash-overlay-popup-label">Owner</span>
                      <span className="dash-overlay-popup-value">{paymentInfo.buyer_name}</span>
                    </div>
                    {paymentInfo.buyer_phone && (
                      <div className="dash-overlay-popup-row">
                        <span className="dash-overlay-popup-label">Phone</span>
                        <a className="dash-overlay-popup-value dash-overlay-popup-phone" href={`tel:${paymentInfo.buyer_phone}`}>
                          {paymentInfo.buyer_phone}
                        </a>
                      </div>
                    )}
                    {installments.length > 0 && (
                      <div className="dash-overlay-popup-payment">
                        <div className="dash-overlay-popup-payment-meta">
                          <span>{paidCount} / {installments.length} installments paid</span>
                          <span>&#8377;{formatPrice(paidAmount)}</span>
                        </div>
                        <div className="dash-overlay-popup-bar-track">
                          <div className="dash-overlay-popup-bar-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="dash-overlay-popup-payment-pct">{progressPct}% of &#8377;{formatPrice(totalAmount)}</div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="dash-overlay-popup-actions">
                <button className="dash-btn dash-btn--primary dash-btn--sm" onClick={() => navigate(`/admin/plots/${plot.id}`)}>
                  View Plot →
                </button>
                <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={() => setSelectedOverlayId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
