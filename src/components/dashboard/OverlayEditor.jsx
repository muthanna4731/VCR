import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { useParams, Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { STATUS_COLORS, STATUS_LABELS, formatPrice } from '../../data/mockData'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'
import { snapToEdge, applyCut, centroid as geoCentroid } from '../../lib/geometryUtils'

/* ─── Helpers ─── */

function mapOverlay(row) {
  return {
    id: row.id,
    plotId: row.plot_id,
    layoutId: row.layout_id,
    coordinates: row.coordinates,
    labelPosition: row.label_position,
    plotNumber: row.plots?.plot_number ?? '',
    plotStatus: row.plots?.status ?? 'available',
  }
}

function centroid(coords) {
  const x = coords.reduce((s, p) => s + p.x, 0) / coords.length
  const y = coords.reduce((s, p) => s + p.y, 0) / coords.length
  return { x, y }
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function toSvgPoints(coords) {
  return coords.map(p => `${p.x},${p.y}`).join(' ')
}

const SNAP_THRESHOLD = 1.5
const MIN_POINT_DISTANCE = 0.5
const MAX_HISTORY = 50
const DBLCLICK_DELAY = 250

const MAP_MIN_ZOOM = 1
const MAP_MAX_ZOOM = 4
const MAP_ZOOM_STEP = 1.3

const PENDING_COLORS = [
  '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48',
]

/* ─── Drawing history reducer (undo / redo) ─── */

function historyReducer(state, action) {
  switch (action.type) {
    case 'push': {
      const past = [...state.past, state.present].slice(-MAX_HISTORY)
      return { past, present: action.points, future: [] }
    }
    case 'undo': {
      if (state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      }
    }
    case 'reset':
      return { past: [], present: [], future: [] }
    default:
      return state
  }
}

const HISTORY_INIT = { past: [], present: [], future: [] }

/* ─── Main component ─── */

export default function OverlayEditor() {
  const { id: layoutId } = useParams()
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const svgRef = useRef(null)
  const clickTimer = useRef(null)

  /* Data state */
  const [layout, setLayout] = useState(null)
  const [plots, setPlots] = useState([])
  const [overlays, setOverlays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* Drawing state */
  const [drawMode, setDrawMode] = useState(false)
  const [history, dispatch] = useReducer(historyReducer, HISTORY_INIT)
  const currentPolygon = history.present
  const [mousePos, setMousePos] = useState(null)
  const [isSnapping, setIsSnapping] = useState(false)

  /* Batch drawing state */
  const [pendingPolygons, setPendingPolygons] = useState([])

  /* Vertex editing state */
  const [editingOverlayId, setEditingOverlayId] = useState(null)
  const [dragVertexIdx, setDragVertexIdx] = useState(null)
  const [editedCoords, setEditedCoords] = useState(null)

  /* Assignment modal */
  const [assigning, setAssigning] = useState(false)
  const [batchAssignments, setBatchAssignments] = useState({})
  const [saving, setSaving] = useState(false)

  /* Selected overlay (info panel) */
  const [selectedOverlayId, setSelectedOverlayId] = useState(null)

  /* Zoom/pan state */
  const [mapZoom, setMapZoom] = useState(MAP_MIN_ZOOM)
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 })
  const outerRef = useRef(null)
  const isPanningMap = useRef(false)
  const panLast = useRef(null)

  /* Payment info for selected overlay popup */
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentInfoLoading, setPaymentInfoLoading] = useState(false)

  /* ─── Batch map (cake-cutter) state ─── */
  // Phases: null → 'drawing-boundary' → 'cutting' → 'adjusting' → assign modal
  const [batchMapMode, setBatchMapMode] = useState(null)
  const [batchSegments, setBatchSegments] = useState([])         // subdivided polygons
  const [batchCutPoints, setBatchCutPoints] = useState([])       // current cut polyline being drawn
  const [batchCutSnap, setBatchCutSnap] = useState(null)         // snap indicator {point, segmentIndex, edgeIndex}
  const [batchCutHistory, setBatchCutHistory] = useState([])     // undo stack of previous segment states
  const [batchDragVertex, setBatchDragVertex] = useState(null)   // {segIdx, vertIdx} for adjust mode
  const batchCutStartSnap = useRef(null)                         // snap info for cut start point
  const BATCH_SNAP_THRESHOLD = 3.0

  /* ─── Data loading ─── */

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [layoutRes, plotsRes, overlaysRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, name, layout_image_url, cities(name)').eq('id', layoutId).single(),
          { label: 'Load overlay editor layout' }
        ),
        runSupabaseRequest(
          () => supabase.from('plots').select('id, plot_number, status').eq('layout_id', layoutId).order('plot_number'),
          { label: 'Load overlay editor plots' }
        ),
        runSupabaseRequest(
          () => supabase.from('plot_overlays').select('id, plot_id, layout_id, coordinates, label_position, plots(plot_number, status)').eq('layout_id', layoutId),
          { label: 'Load overlay editor overlays' }
        ),
      ])

      setLayout(layoutRes.data)
      setPlots(plotsRes.data)
      setOverlays(overlaysRes.data.map(mapOverlay))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [layoutId])

  useEffect(() => { load() }, [load])

  /* ─── Keyboard shortcuts ─── */

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (assigning) return
        if (batchMapMode) {
          if (batchMapMode === 'drawing-boundary' && currentPolygon.length > 0) {
            dispatch({ type: 'reset' })
          } else if (batchMapMode === 'cutting' && batchCutPoints.length > 0) {
            setBatchCutPoints([])
            setBatchCutSnap(null)
          } else {
            cancelBatchMap()
          }
          return
        }
        if (drawMode) {
          if (currentPolygon.length > 0) {
            dispatch({ type: 'reset' })
          } else if (pendingPolygons.length > 0) {
            openBatchAssign()
          } else {
            cancelDraw()
          }
        } else if (editingOverlayId) {
          cancelEdit()
        }
        return
      }

      // Batch map keyboard shortcuts
      if (batchMapMode === 'drawing-boundary') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
          e.preventDefault(); dispatch({ type: 'redo' })
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault(); dispatch({ type: 'undo' })
        } else if (e.key === 'Enter' && currentPolygon.length >= 3) {
          finishBoundary()
        }
        return
      }
      if (batchMapMode === 'cutting') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault(); undoBatchCut()
        } else if (e.key === 'Enter') {
          finishCutting()
        }
        return
      }
      if (batchMapMode === 'adjusting') {
        if (e.key === 'Enter') finishBatchMap()
        return
      }

      if (drawMode && !assigning) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
          e.preventDefault()
          dispatch({ type: 'redo' })
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault()
          dispatch({ type: 'undo' })
        } else if (e.key === 'z' || e.key === 'Z') {
          if (!e.metaKey && !e.ctrlKey) dispatch({ type: 'undo' })
        } else if (e.key === 'Enter') {
          if (currentPolygon.length >= 3) finishPolygon()
        }
      }

      if (editingOverlayId && e.key === 'Enter') {
        saveEditedOverlay()
      }

      if (!drawMode && !editingOverlayId && !assigning && (e.key === 'e' || e.key === 'E') && selectedOverlayId) {
        const ov = overlays.find(o => o.id === selectedOverlayId)
        if (ov) startEdit(ov)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawMode, currentPolygon, editingOverlayId, editedCoords, pendingPolygons, assigning, selectedOverlayId, overlays, batchMapMode, batchCutPoints, batchSegments, batchCutHistory])

  /* ─── Zoom/pan helpers ─── */

  const clampMapZoom = (z) => Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, z))

  const resetMapView = useCallback(() => {
    setMapZoom(MAP_MIN_ZOOM)
    setMapPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => { resetMapView() }, [layoutId, resetMapView])

  // Mouse-wheel zoom — non-passive to allow preventDefault
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setMapZoom(prev => {
        const next = clampMapZoom(prev * factor)
        if (next <= MAP_MIN_ZOOM) setMapPan({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ─── Payment info for selected overlay popup ─── */

  useEffect(() => {
    if (!selectedOverlayId || drawMode || editingOverlayId) {
      setPaymentInfo(null)
      return
    }
    const ov = overlays.find(o => o.id === selectedOverlayId)
    if (!ov?.plotId) { setPaymentInfo(null); return }

    let cancelled = false
    setPaymentInfoLoading(true)

    async function fetchPayment() {
      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('id, buyer_name, buyer_phone, total_amount, payment_installments(id, status, amount, paid_at)')
            .eq('plot_id', ov.plotId)
            .maybeSingle(),
          { label: 'Fetch payment info for overlay popup' }
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
  }, [selectedOverlayId, drawMode, editingOverlayId, overlays])

  /* ─── Coordinate helpers ─── */

  function getRelativeCoords(e) {
    const svg = svgRef.current
    if (svg) {
      const ctm = svg.getScreenCTM()
      if (ctm) {
        const pt = new DOMPoint(e.clientX, e.clientY)
        const svgPt = pt.matrixTransform(ctm.inverse())
        return {
          x: parseFloat(svgPt.x.toFixed(2)),
          y: parseFloat(svgPt.y.toFixed(2)),
        }
      }
    }
    if (!imgRef.current) return { x: 0, y: 0 }
    const rect = imgRef.current.getBoundingClientRect()
    return {
      x: parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2)),
      y: parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2)),
    }
  }

  /* ─── Draw mode handlers ─── */

  function handleCanvasClick(e) {
    if (editingOverlayId) return

    // Batch map: cutting mode
    if (batchMapMode === 'cutting') {
      handleBatchCutClick(e)
      return
    }

    if (!drawMode) return
    const coords = getRelativeCoords(e)

    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      // Batch map: boundary drawing — finish on snap
      if (batchMapMode === 'drawing-boundary' && isSnapping && currentPolygon.length >= 3) {
        finishBoundary()
        return
      }

      if (isSnapping && currentPolygon.length >= 3) {
        finishPolygon()
        return
      }

      if (currentPolygon.length > 0) {
        const last = currentPolygon[currentPolygon.length - 1]
        if (dist(last, coords) < MIN_POINT_DISTANCE) return
      }

      dispatch({ type: 'push', points: [...currentPolygon, coords] })
    }, DBLCLICK_DELAY)
  }

  function handleDoubleClick(e) {
    if (batchMapMode === 'cutting' || batchMapMode === 'adjusting') return
    if (batchMapMode === 'drawing-boundary') {
      e.preventDefault()
      e.stopPropagation()
      clearTimeout(clickTimer.current)
      if (currentPolygon.length >= 3) finishBoundary()
      return
    }
    if (!drawMode) return
    e.preventDefault()
    e.stopPropagation()
    clearTimeout(clickTimer.current)
    if (currentPolygon.length >= 3) finishPolygon()
  }

  function handleCanvasMouseDown(e) {
    // Start map pan when not in draw/edit mode and map is zoomed
    if (!drawMode && !editingOverlayId && mapZoom > MAP_MIN_ZOOM) {
      isPanningMap.current = true
      panLast.current = { x: e.clientX, y: e.clientY }
      outerRef.current?.setAttribute('data-panning', 'true')
    }
  }

  function handleMouseMove(e) {
    // Map pan
    if (isPanningMap.current && panLast.current) {
      const dx = e.clientX - panLast.current.x
      const dy = e.clientY - panLast.current.y
      setMapPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      panLast.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Batch map: adjusting mode — drag vertices
    if (batchMapMode === 'adjusting' && batchDragVertex) {
      handleBatchAdjustMouseMove(e)
      return
    }

    // Batch map: cutting mode — snap to edges
    if (batchMapMode === 'cutting') {
      handleBatchCutMouseMove(e)
      return
    }

    if (editingOverlayId && dragVertexIdx !== null && editedCoords) {
      const coords = getRelativeCoords(e)
      const updated = editedCoords.map((p, i) => (i === dragVertexIdx ? coords : p))
      setEditedCoords(updated)
      return
    }

    if (!drawMode || currentPolygon.length === 0) {
      setMousePos(null)
      setIsSnapping(false)
      return
    }

    const coords = getRelativeCoords(e)
    setMousePos(coords)

    if (currentPolygon.length >= 3) {
      setIsSnapping(dist(coords, currentPolygon[0]) <= SNAP_THRESHOLD)
    } else {
      setIsSnapping(false)
    }
  }

  function handleMouseUp() {
    if (batchDragVertex) handleBatchAdjustMouseUp()
    if (dragVertexIdx !== null) setDragVertexIdx(null)
    if (isPanningMap.current) {
      isPanningMap.current = false
      panLast.current = null
      outerRef.current?.removeAttribute('data-panning')
    }
  }

  function handleMouseLeave() {
    setMousePos(null)
    setIsSnapping(false)
    if (dragVertexIdx !== null) setDragVertexIdx(null)
    if (isPanningMap.current) {
      isPanningMap.current = false
      panLast.current = null
      outerRef.current?.removeAttribute('data-panning')
    }
  }

  /* ─── Map zoom controls ─── */

  const mapZoomIn = () => setMapZoom(prev => clampMapZoom(prev * MAP_ZOOM_STEP))
  const mapZoomOut = () => setMapZoom(prev => {
    const next = clampMapZoom(prev / MAP_ZOOM_STEP)
    if (next <= MAP_MIN_ZOOM) setMapPan({ x: 0, y: 0 })
    return next
  })

  /* ─── Draw lifecycle ─── */

  function cancelDraw() {
    dispatch({ type: 'reset' })
    setPendingPolygons([])
    setDrawMode(false)
    setMousePos(null)
    setIsSnapping(false)
  }

  function finishPolygon() {
    if (currentPolygon.length < 3) {
      setError('A polygon needs at least 3 points.')
      return
    }
    setPendingPolygons(prev => [...prev, [...currentPolygon]])
    dispatch({ type: 'reset' })
    setMousePos(null)
    setIsSnapping(false)
  }

  function removePendingPolygon(idx) {
    setPendingPolygons(prev => prev.filter((_, i) => i !== idx))
    setBatchAssignments(prev => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k)
        if (ki < idx) next[ki] = v
        else if (ki > idx) next[ki - 1] = v
      })
      return next
    })
  }

  function openBatchAssign() {
    setBatchAssignments({})
    setAssigning(true)
  }

  /* ─── Vertex editing ─── */

  function startEdit(overlay) {
    if (drawMode) return
    setEditingOverlayId(overlay.id)
    setEditedCoords([...overlay.coordinates])
    setSelectedOverlayId(overlay.id)
  }

  function cancelEdit() {
    setEditingOverlayId(null)
    setEditedCoords(null)
    setDragVertexIdx(null)
  }

  function handleVertexMouseDown(e, idx) {
    e.stopPropagation()
    e.preventDefault()
    setDragVertexIdx(idx)
  }

  function deleteVertex(idx) {
    if (!editedCoords || editedCoords.length <= 3) return
    setEditedCoords(editedCoords.filter((_, i) => i !== idx))
  }

  async function saveEditedOverlay() {
    if (!editingOverlayId || !editedCoords || editedCoords.length < 3) return
    setSaving(true)
    setError(null)

    const label = centroid(editedCoords)

    try {
      await runSupabaseMutation(
        () => supabase
          .from('plot_overlays')
          .update({
            coordinates: editedCoords,
            label_position: { x: label.x, y: label.y },
          })
          .eq('id', editingOverlayId),
        { label: 'Save edited overlay' }
      )
    } catch (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    await load()
    cancelEdit()
    setSaving(false)
  }

  /* ─── Save batch overlays ─── */

  async function handleSaveBatch() {
    const entries = Object.entries(batchAssignments).filter(([, plotId]) => plotId)
    if (entries.length === 0) return

    setSaving(true)
    setError(null)

    const rows = entries.map(([idx, plotId]) => {
      const coords = pendingPolygons[parseInt(idx)]
      const label = centroid(coords)
      return {
        plot_id: plotId,
        layout_id: layoutId,
        overlay_type: 'polygon',
        coordinates: coords,
        label_position: { x: label.x, y: label.y },
      }
    })

    try {
      await runSupabaseMutation(
        () => supabase
          .from('plot_overlays')
          .upsert(rows, { onConflict: 'plot_id' }),
        { label: 'Save overlay batch' }
      )
    } catch (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    await load()
    dispatch({ type: 'reset' })
    setPendingPolygons([])
    setDrawMode(false)
    setMousePos(null)
    setIsSnapping(false)
    setAssigning(false)
    setBatchAssignments({})
    setSaving(false)
  }

  /* ─── Delete overlay ─── */

  async function handleDeleteOverlay(overlayId) {
    try {
      await runSupabaseMutation(
        () => supabase
          .from('plot_overlays')
          .delete()
          .eq('id', overlayId),
        { label: 'Delete overlay' }
      )
      setOverlays(prev => prev.filter(o => o.id !== overlayId))
      setSelectedOverlayId(null)
      if (editingOverlayId === overlayId) cancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  /* ─── Batch map handlers ─── */

  function startBatchMap() {
    setDrawMode(true)
    setBatchMapMode('drawing-boundary')
    dispatch({ type: 'reset' })
    setPendingPolygons([])
    setMousePos(null)
    setIsSnapping(false)
  }

  function finishBoundary() {
    if (currentPolygon.length < 3) return
    setBatchSegments([[...currentPolygon]])
    setBatchMapMode('cutting')
    setBatchCutHistory([])
    setBatchCutPoints([])
    setBatchCutSnap(null)
    dispatch({ type: 'reset' })
    setMousePos(null)
    setIsSnapping(false)
  }

  function handleBatchCutClick(e) {
    const coords = getRelativeCoords(e)
    const snap = snapToEdge(batchSegments, coords, BATCH_SNAP_THRESHOLD)

    if (batchCutPoints.length === 0) {
      // First click — must be on an edge
      if (!snap) return
      batchCutStartSnap.current = snap
      setBatchCutPoints([snap.point])
    } else {
      // Subsequent clicks
      if (snap) {
        // Clicked on an edge — finish the cut
        const cutLine = [...batchCutPoints, snap.point]
        const startSnap = batchCutStartSnap.current
        const endSnap = snap
        const newSegments = applyCut(batchSegments, cutLine, startSnap, endSnap)
        if (newSegments.length > batchSegments.length) {
          setBatchCutHistory(prev => [...prev, batchSegments])
          setBatchSegments(newSegments)
        }
        setBatchCutPoints([])
        setBatchCutSnap(null)
        batchCutStartSnap.current = null
      } else {
        // Intermediate point (not on edge)
        setBatchCutPoints(prev => [...prev, coords])
      }
    }
  }

  function handleBatchCutMouseMove(e) {
    const coords = getRelativeCoords(e)
    setMousePos(coords)
    const snap = snapToEdge(batchSegments, coords, BATCH_SNAP_THRESHOLD)
    setBatchCutSnap(snap)
  }

  function undoBatchCut() {
    if (batchCutHistory.length === 0) return
    const prev = batchCutHistory[batchCutHistory.length - 1]
    setBatchCutHistory(h => h.slice(0, -1))
    setBatchSegments(prev)
  }

  function finishCutting() {
    setBatchMapMode('adjusting')
    setBatchCutPoints([])
    setBatchCutSnap(null)
    setMousePos(null)
  }

  function handleBatchAdjustMouseDown(e, segIdx, vertIdx) {
    e.stopPropagation()
    e.preventDefault()
    setBatchDragVertex({ segIdx, vertIdx })
  }

  function handleBatchAdjustMouseMove(e) {
    if (!batchDragVertex) return
    const coords = getRelativeCoords(e)
    setBatchSegments(prev => prev.map((seg, si) =>
      si === batchDragVertex.segIdx
        ? seg.map((p, vi) => vi === batchDragVertex.vertIdx ? coords : p)
        : seg
    ))
  }

  function handleBatchAdjustMouseUp() {
    setBatchDragVertex(null)
  }

  function finishBatchMap() {
    // Move segments into pending polygons and open assign modal
    setPendingPolygons(batchSegments)
    setBatchMapMode(null)
    setBatchSegments([])
    setBatchCutHistory([])
    setBatchCutPoints([])
    setBatchCutSnap(null)
    setBatchDragVertex(null)
    setDrawMode(true)
    openBatchAssign()
  }

  function cancelBatchMap() {
    setBatchMapMode(null)
    setBatchSegments([])
    setBatchCutHistory([])
    setBatchCutPoints([])
    setBatchCutSnap(null)
    setBatchDragVertex(null)
    batchCutStartSnap.current = null
    setDrawMode(false)
    dispatch({ type: 'reset' })
    setPendingPolygons([])
    setMousePos(null)
    setIsSnapping(false)
  }

  /* ─── Derived data ─── */

  const overlaidPlotIds = new Set(overlays.map(o => o.plotId))
  const unassignedPlots = plots.filter(p => !overlaidPlotIds.has(p.id))

  const effectiveMousePos = isSnapping && currentPolygon.length >= 3
    ? currentPolygon[0]
    : mousePos

  const isEditing = editingOverlayId !== null

  const assignedInBatch = new Set(Object.values(batchAssignments).filter(Boolean))
  const batchAssignedCount = assignedInBatch.size

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading-inline">Loading plot mapper...</div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="dash-page">
        <p className="dash-error">{error ?? 'Layout not found.'}</p>
        <Link to="/admin/layouts" className="dash-btn">← Back to Layouts</Link>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div className="dash-breadcrumb">
          <Link to="/admin/layouts" className="dash-back-btn">← Layouts</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span>{layout.name}</span>
          <span className="dash-breadcrumb-sep">/</span>
          <span>Plot Mapper</span>
        </div>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-overlay-layout">
        {/* Canvas area */}
        <div className="dash-overlay-canvas-wrap">
          <div className="dash-overlay-toolbar">
            {/* ── Batch map toolbars ── */}
            {batchMapMode === 'drawing-boundary' ? (
              <>
                <span className="dash-overlay-hint">
                  <span className="dash-batch-badge">Batch Map</span>
                  {currentPolygon.length === 0
                    ? 'Draw the outer boundary — click to place vertices'
                    : `${currentPolygon.length} point${currentPolygon.length !== 1 ? 's' : ''} — close the shape to proceed`}
                  <span className="dash-overlay-shortcuts"> · Enter/dbl-click=finish · Esc=cancel</span>
                </span>
                <button className="dash-btn dash-btn--sm" onClick={() => dispatch({ type: 'undo' })} disabled={history.past.length === 0}>Undo</button>
                <button className="dash-btn dash-btn--sm" onClick={() => dispatch({ type: 'redo' })} disabled={history.future.length === 0}>Redo</button>
                {currentPolygon.length >= 3 && (
                  <button className="dash-btn dash-btn--sm" onClick={finishBoundary} style={{ borderColor: '#34c759', color: '#34c759' }}>
                    Finish Boundary
                  </button>
                )}
                <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={cancelBatchMap}>Cancel</button>
              </>
            ) : batchMapMode === 'cutting' ? (
              <>
                <span className="dash-overlay-hint">
                  <span className="dash-batch-badge">Batch Map — Cut</span>
                  {batchCutPoints.length === 0
                    ? 'Click on an edge to start a cut line'
                    : `${batchCutPoints.length} point${batchCutPoints.length !== 1 ? 's' : ''} — click an edge to finish cut, or click elsewhere for intermediate points`}
                  <span className="dash-overlay-shortcuts"> · Ctrl+Z=undo cut · Enter=done cutting · Esc=cancel cut</span>
                </span>
                <span className="dash-overlay-count">{batchSegments.length} segment{batchSegments.length !== 1 ? 's' : ''}</span>
                <button className="dash-btn dash-btn--sm" onClick={undoBatchCut} disabled={batchCutHistory.length === 0}>Undo Cut</button>
                {batchCutPoints.length > 0 && (
                  <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={() => { setBatchCutPoints([]); setBatchCutSnap(null) }}>Cancel Cut</button>
                )}
                <button className="dash-btn dash-btn--primary dash-btn--sm" onClick={finishCutting} disabled={batchSegments.length < 2}>
                  Done Cutting
                </button>
                <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={cancelBatchMap}>Cancel All</button>
              </>
            ) : batchMapMode === 'adjusting' ? (
              <>
                <span className="dash-overlay-hint">
                  <span className="dash-batch-badge">Batch Map — Adjust</span>
                  Drag vertices to fine-tune segment shapes
                  <span className="dash-overlay-shortcuts"> · Enter=assign plots · Esc=cancel</span>
                </span>
                <span className="dash-overlay-count">{batchSegments.length} segment{batchSegments.length !== 1 ? 's' : ''}</span>
                <button className="dash-btn dash-btn--primary dash-btn--sm" onClick={finishBatchMap}>
                  Assign {batchSegments.length} Plot{batchSegments.length !== 1 ? 's' : ''}
                </button>
                <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={cancelBatchMap}>Cancel</button>
              </>
            ) : !drawMode && !isEditing ? (
              <>
                <button
                  className="dash-btn dash-btn--primary dash-btn--sm"
                  onClick={() => setDrawMode(true)}
                  disabled={!layout.layout_image_url}
                >
                  + Draw Plots
                </button>
                <button
                  className="dash-btn dash-btn--sm dash-btn--batch"
                  onClick={startBatchMap}
                  disabled={!layout.layout_image_url}
                >
                  ⊞ Batch Map
                </button>
                <span className="dash-overlay-count">
                  {overlays.length} / {plots.length} plots mapped
                </span>
              </>
            ) : isEditing ? (
              <>
                <span className="dash-overlay-hint">
                  Editing vertices — drag to move, right-click to delete
                  <span className="dash-overlay-shortcuts"> · Enter=save · Esc=cancel</span>
                </span>
                <button
                  className="dash-btn dash-btn--primary dash-btn--sm"
                  onClick={saveEditedOverlay}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="dash-btn dash-btn--ghost dash-btn--sm"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="dash-overlay-hint">
                  {currentPolygon.length === 0
                    ? pendingPolygons.length === 0
                      ? 'Click on the map to place vertices'
                      : `${pendingPolygons.length} polygon${pendingPolygons.length !== 1 ? 's' : ''} drawn — draw more or assign`
                    : `${currentPolygon.length} point${currentPolygon.length !== 1 ? 's' : ''} placed`}
                  {currentPolygon.length > 0 && (
                    <span className="dash-overlay-shortcuts">
                      {' · '}Ctrl+Z=undo · Ctrl+Shift+Z=redo · Enter/dbl-click=finish · Esc=discard
                    </span>
                  )}
                </span>
                <button
                  className="dash-btn dash-btn--sm"
                  onClick={() => dispatch({ type: 'undo' })}
                  disabled={history.past.length === 0}
                >
                  Undo
                </button>
                <button
                  className="dash-btn dash-btn--sm"
                  onClick={() => dispatch({ type: 'redo' })}
                  disabled={history.future.length === 0}
                >
                  Redo
                </button>
                {currentPolygon.length >= 3 && (
                  <button
                    className="dash-btn dash-btn--sm"
                    onClick={finishPolygon}
                    style={{ borderColor: '#34c759', color: '#34c759' }}
                  >
                    Finish Polygon
                  </button>
                )}
                <button
                  className="dash-btn dash-btn--primary dash-btn--sm"
                  onClick={openBatchAssign}
                  disabled={pendingPolygons.length === 0}
                >
                  Assign {pendingPolygons.length > 0 ? `${pendingPolygons.length} Plot${pendingPolygons.length !== 1 ? 's' : ''}` : 'Plots'}
                </button>
                <button
                  className="dash-btn dash-btn--ghost dash-btn--sm"
                  onClick={cancelDraw}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {!layout.layout_image_url ? (
            <div className="dash-overlay-no-image">
              <p>No site plan uploaded for this layout.</p>
              <Link to="/admin/layouts" className="dash-btn dash-btn--sm">
                Upload in Layout Manager →
              </Link>
            </div>
          ) : (
            <>
            <div
              ref={outerRef}
              className={`dash-overlay-outer${drawMode ? ' dash-overlay-outer--drawing' : ''}${isEditing ? ' dash-overlay-outer--editing' : ''}${batchMapMode ? ' dash-overlay-outer--batch' : ''}`}
              style={{ cursor: batchMapMode === 'cutting' || batchMapMode === 'drawing-boundary' ? 'crosshair' : batchMapMode === 'adjusting' ? 'default' : !drawMode && !isEditing && mapZoom > 1 ? 'grab' : undefined }}
            >
              <div
                className="dash-overlay-interactive"
                style={{
                  transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                  transformOrigin: 'center center',
                }}
              >
            <div
              className={`dash-overlay-canvas${drawMode ? ' dash-overlay-canvas--drawing' : ''}${isEditing ? ' dash-overlay-canvas--editing' : ''}`}
              ref={containerRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onContextMenu={isEditing ? e => e.preventDefault() : undefined}
            >
              <div className="dash-overlay-inner">
              <img
                ref={imgRef}
                src={layout.layout_image_url}
                alt={`${layout.name} site plan`}
                className="dash-overlay-image"
                draggable={false}
              />

              <svg
                ref={svgRef}
                className="dash-overlay-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={drawMode || batchMapMode === 'cutting' || batchMapMode === 'drawing-boundary' ? { cursor: 'crosshair', pointerEvents: 'auto' } : batchMapMode === 'adjusting' ? { pointerEvents: 'auto' } : undefined}
              >
                {/* Existing overlays */}
                {overlays.map(overlay => {
                  const isSelected = overlay.id === selectedOverlayId
                  const isBeingEdited = overlay.id === editingOverlayId
                  const coords = isBeingEdited && editedCoords ? editedCoords : overlay.coordinates

                  return (
                    <g
                      key={overlay.id}
                      onClick={e => {
                        if (drawMode) return
                        e.stopPropagation()
                        if (!isEditing) {
                          setSelectedOverlayId(isSelected ? null : overlay.id)
                        }
                      }}
                      style={{ cursor: drawMode ? 'crosshair' : 'pointer' }}
                    >
                      <polygon
                        points={toSvgPoints(coords)}
                        fill={
                          isBeingEdited
                            ? 'rgb(0, 170, 255)'
                            : STATUS_COLORS[overlay.plotStatus] + (isSelected ? '88' : '55')
                        }
                        stroke={
                          isBeingEdited
                            ? '#046ebc'
                            : isSelected
                              ? '#046ebc'
                              : STATUS_COLORS[overlay.plotStatus]
                        }
                        strokeWidth={isBeingEdited ? 0.1 : isSelected ? 0.2 : 0.1}
                        strokeLinejoin="round"
                        strokeDasharray={isBeingEdited ? '1.2,0.6' : 'none'}
                      />
                      {overlay.labelPosition && !isBeingEdited && (
                        <text
                          x={overlay.labelPosition.x}
                          y={overlay.labelPosition.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={1.3}
                          fontWeight="600"
                          fontFamily="'Instrument Sans', sans-serif"
                          fill="#ffffff"
                          stroke="rgba(0, 30, 129, 0.88)"
                          strokeWidth={0.1}
                          paintOrder="stroke"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {overlay.plotNumber}
                        </text>
                      )}

                      {/* Editable vertex handles */}
                      {isBeingEdited && editedCoords && editedCoords.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={dragVertexIdx === i ? 0.2 : 0.1}
                          fill={dragVertexIdx === i ? '#046ebc' : '#fff'}
                          stroke="#046ebc"
                          strokeWidth={0.1}
                          style={{ cursor: 'grab', pointerEvents: 'all' }}
                          onMouseDown={e => handleVertexMouseDown(e, i)}
                          onContextMenu={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteVertex(i)
                          }}
                        />
                      ))}
                    </g>
                  )
                })}

                {/* Pending polygons (batch drawn, not yet assigned) */}
                {pendingPolygons.map((coords, idx) => {
                  const color = PENDING_COLORS[idx % PENDING_COLORS.length]
                  const center = centroid(coords)
                  return (
                    <g key={`pending-${idx}`}>
                      <polygon
                        points={toSvgPoints(coords)}
                        fill={color + '33'}
                        stroke={color}
                        strokeWidth={0.1}
                        strokeLinejoin="round"
                      />
                      <text
                        x={center.x}
                        y={center.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={2}
                        fontWeight="700"
                        fontFamily="'Instrument Sans', sans-serif"
                        fill="#fff"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {idx + 1}
                      </text>
                    </g>
                  )
                })}

                {/* Current polygon being drawn */}
                {currentPolygon.length > 0 && (
                  <>
                    <polygon
                      points={toSvgPoints(
                        effectiveMousePos
                          ? [...currentPolygon, effectiveMousePos]
                          : currentPolygon
                      )}
                      fill="rgba(52,199,89,0.2)"
                      stroke="#34c759"
                      strokeWidth={0.1}
                      strokeLinejoin="round"
                      strokeDasharray="1.5,0.8"
                    />
                    {effectiveMousePos && (
                      <line
                        x1={currentPolygon[currentPolygon.length - 1].x}
                        y1={currentPolygon[currentPolygon.length - 1].y}
                        x2={effectiveMousePos.x}
                        y2={effectiveMousePos.y}
                        stroke="#34c759"
                        strokeWidth={0.1}
                        strokeDasharray="1,0.5"
                      />
                    )}
                    {currentPolygon.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 && isSnapping ? 1 : 0.3}
                        fill={i === 0 && isSnapping ? '#046ebc' : '#34c759'}
                        stroke="white"
                        strokeWidth={0.1}
                      >
                        {i === 0 && isSnapping && (
                          <animate
                            attributeName="r"
                            values="1.0;1.4;1.0"
                            dur="0.8s"
                            repeatCount="indefinite"
                          />
                        )}
                      </circle>
                    ))}
                    {isSnapping && currentPolygon.length >= 3 && (
                      <circle
                        cx={currentPolygon[0].x}
                        cy={currentPolygon[0].y}
                        r={2}
                        fill="none"
                        stroke="#046ebc"
                        strokeWidth={0.1}
                        strokeDasharray="0.8,0.4"
                        opacity="0.6"
                      >
                        <animate
                          attributeName="r"
                          values="1.5;2.5;1.5"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </>
                )}

                {/* ── Batch map segments ── */}
                {(batchMapMode === 'cutting' || batchMapMode === 'adjusting') && batchSegments.map((seg, idx) => {
                  const color = PENDING_COLORS[idx % PENDING_COLORS.length]
                  const center = geoCentroid(seg)
                  return (
                    <g key={`bseg-${idx}`}>
                      <polygon
                        points={toSvgPoints(seg)}
                        fill={color + '33'}
                        stroke={color}
                        strokeWidth={0.15}
                        strokeLinejoin="round"
                      />
                      <text
                        x={center.x}
                        y={center.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={1.8}
                        fontWeight="700"
                        fontFamily="'Instrument Sans', sans-serif"
                        fill="#fff"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth={0.08}
                        paintOrder="stroke"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {idx + 1}
                      </text>

                      {/* Vertex handles in adjust mode */}
                      {batchMapMode === 'adjusting' && seg.map((p, vi) => (
                        <circle
                          key={vi}
                          cx={p.x}
                          cy={p.y}
                          r={batchDragVertex?.segIdx === idx && batchDragVertex?.vertIdx === vi ? 0.6 : 0.4}
                          fill={batchDragVertex?.segIdx === idx && batchDragVertex?.vertIdx === vi ? '#046ebc' : '#fff'}
                          stroke="#046ebc"
                          strokeWidth={0.12}
                          style={{ cursor: 'grab', pointerEvents: 'all' }}
                          onMouseDown={e => handleBatchAdjustMouseDown(e, idx, vi)}
                        />
                      ))}
                    </g>
                  )
                })}

                {/* Batch map: cut line being drawn */}
                {batchMapMode === 'cutting' && batchCutPoints.length > 0 && (
                  <g>
                    {/* Completed segments of current cut */}
                    <polyline
                      points={toSvgPoints(batchCutPoints)}
                      fill="none"
                      stroke="#ff3b30"
                      strokeWidth={0.15}
                      strokeDasharray="1,0.5"
                    />
                    {/* Preview line to cursor */}
                    {mousePos && (
                      <line
                        x1={batchCutPoints[batchCutPoints.length - 1].x}
                        y1={batchCutPoints[batchCutPoints.length - 1].y}
                        x2={batchCutSnap ? batchCutSnap.point.x : mousePos.x}
                        y2={batchCutSnap ? batchCutSnap.point.y : mousePos.y}
                        stroke="#ff3b30"
                        strokeWidth={0.12}
                        strokeDasharray="0.8,0.4"
                        opacity="0.7"
                      />
                    )}
                    {/* Cut point vertices */}
                    {batchCutPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={0.4} fill="#ff3b30" stroke="#fff" strokeWidth={0.1} />
                    ))}
                  </g>
                )}

                {/* Batch map: snap indicator */}
                {batchMapMode === 'cutting' && batchCutSnap && (
                  <circle
                    cx={batchCutSnap.point.x}
                    cy={batchCutSnap.point.y}
                    r={0.6}
                    fill="rgba(255,59,48,0.4)"
                    stroke="#ff3b30"
                    strokeWidth={0.12}
                  >
                    <animate attributeName="r" values="0.5;0.9;0.5" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </svg>
              </div>
            </div>
              </div>{/* end dash-overlay-interactive */}

              {/* Zoom controls */}
              <div className="dash-overlay-zoom-controls">
                <button
                  className="dash-overlay-zoom-btn"
                  onClick={mapZoomIn}
                  aria-label="Zoom in"
                  disabled={mapZoom >= MAP_MAX_ZOOM}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="dash-overlay-zoom-level">{Math.round(mapZoom * 100)}%</span>
                <button
                  className="dash-overlay-zoom-btn"
                  onClick={mapZoomOut}
                  aria-label="Zoom out"
                  disabled={mapZoom <= MAP_MIN_ZOOM}
                >
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
            </div>{/* end dash-overlay-outer */}

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
          )}
        </div>

        {/* Sidebar panel */}
        <div className="dash-overlay-panel">
          {/* Batch map segment list */}
          {batchMapMode && batchMapMode !== 'drawing-boundary' ? (
            <div className="dash-overlay-legend">
              <h3 className="dash-overlay-legend-title">
                {batchMapMode === 'cutting' ? 'Segments' : 'Adjust Segments'} ({batchSegments.length})
              </h3>
              <ul className="dash-overlay-list">
                {batchSegments.map((seg, idx) => {
                  const color = PENDING_COLORS[idx % PENDING_COLORS.length]
                  return (
                    <li key={idx} className="dash-overlay-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '2rem', height: '2rem', borderRadius: '50%',
                          backgroundColor: color, color: '#fff', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>{seg.length} vertices</span>
                    </li>
                  )
                })}
              </ul>
              {batchMapMode === 'cutting' && (
                <p className="dash-form-hint" style={{ marginTop: '1rem' }}>
                  Draw cut lines across the boundary to subdivide it into plots. Each cut splits segments it crosses.
                </p>
              )}
              {batchMapMode === 'adjusting' && (
                <p className="dash-form-hint" style={{ marginTop: '1rem' }}>
                  Drag any vertex to reshape. Press Enter or click "Assign" when done.
                </p>
              )}
            </div>
          ) : drawMode && pendingPolygons.length > 0 && !assigning ? (
            <div className="dash-overlay-legend">
              <h3 className="dash-overlay-legend-title">
                Drawn Polygons ({pendingPolygons.length})
              </h3>
              <ul className="dash-overlay-list">
                {pendingPolygons.map((coords, idx) => {
                  const color = PENDING_COLORS[idx % PENDING_COLORS.length]
                  return (
                    <li
                      key={idx}
                      className="dash-overlay-item"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            backgroundColor: color,
                            color: '#fff',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span>{coords.length} vertices</span>
                      </span>
                      <button
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={() => removePendingPolygon(idx)}
                        style={{ padding: '0.2rem 0.6rem', fontSize: '1.1rem' }}
                        title="Remove polygon"
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="dash-form-hint" style={{ marginTop: '1rem' }}>
                Keep drawing or click "Assign" in the toolbar when done.
              </p>
            </div>
          ) : selectedOverlayId ? (
            <div className="dash-overlay-info">
              <p className="dash-overlay-info-hint">Plot selected — see popup for details</p>
            </div>
          ) : (
            <div className="dash-overlay-legend">
              <h3 className="dash-overlay-legend-title">Mapped Plots</h3>
              {overlays.length === 0 ? (
                <p className="dash-empty" style={{ fontSize: '1.3rem' }}>
                  No overlays yet. Draw polygons on the map to assign plots.
                </p>
              ) : (
                <ul className="dash-overlay-list">
                  {overlays.map(ov => (
                    <li
                      key={ov.id}
                      className={`dash-overlay-item${selectedOverlayId === ov.id ? ' dash-overlay-item--active' : ''}`}
                      onClick={() => setSelectedOverlayId(ov.id)}
                    >
                      <span
                        className="dash-status-dot"
                        style={{ backgroundColor: STATUS_COLORS[ov.plotStatus] }}
                      />
                      <span>{ov.plotNumber}</span>
                    </li>
                  ))}
                </ul>
              )}

              {unassignedPlots.length > 0 && (
                <>
                  <h3 className="dash-overlay-legend-title" style={{ marginTop: '2rem' }}>
                    Unmapped Plots
                  </h3>
                  <ul className="dash-overlay-list dash-overlay-list--muted">
                    {unassignedPlots.map(p => (
                      <li key={p.id} className="dash-overlay-item">
                        <span
                          className="dash-status-dot"
                          style={{ backgroundColor: STATUS_COLORS[p.status] }}
                        />
                        <span>{p.plot_number}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected plot popup */}
      {selectedOverlayId && !drawMode && !isEditing && (() => {
        const ov = overlays.find(o => o.id === selectedOverlayId)
        if (!ov) return null
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
                  <span className="dash-status-dot" style={{ backgroundColor: STATUS_COLORS[ov.plotStatus] }} />
                  {STATUS_LABELS[ov.plotStatus] ?? ov.plotStatus}
                </span>
              </div>

              {/* Payment info */}
              <div className="dash-overlay-popup-body">
                {paymentInfoLoading ? (
                  <p className="dash-overlay-popup-hint">Loading owner info…</p>
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
                    <div className="dash-overlay-popup-row">
                      <span className="dash-overlay-popup-label">Total</span>
                      <span className="dash-overlay-popup-value">&#8377;{formatPrice(totalAmount)}</span>
                    </div>
                    {installments.length > 0 && (
                      <div className="dash-overlay-popup-payment">
                        <div className="dash-overlay-popup-payment-meta">
                          <span>{paidCount} / {installments.length} installments paid</span>
                          <span>&#8377;{formatPrice(paidAmount)}</span>
                        </div>
                        <div className="dash-overlay-popup-bar-track">
                          <div
                            className="dash-overlay-popup-bar-fill"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="dash-overlay-popup-payment-pct">{progressPct}% paid</div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="dash-overlay-popup-hint">No payment record for this plot.</p>
                )}
              </div>

              {/* Actions */}
              <div className="dash-overlay-popup-actions">
                <button
                  className="dash-btn dash-btn--sm"
                  onClick={() => startEdit(ov)}
                >
                  Edit Vertices <span className="dash-overlay-shortcuts">[E]</span>
                </button>
                <button
                  className="dash-btn dash-btn--danger dash-btn--sm"
                  onClick={() => { handleDeleteOverlay(ov.id); setSelectedOverlayId(null) }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Batch assignment modal */}
      {assigning && pendingPolygons.length > 0 && (
        <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && setAssigning(false)}>
          <div className="dash-modal dash-modal--sm">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">
                Assign {pendingPolygons.length} Polygon{pendingPolygons.length !== 1 ? 's' : ''} to Plots
              </h2>
              <button className="dash-modal-close" onClick={() => setAssigning(false)} aria-label="Close">✕</button>
            </div>

            <div className="dash-form" style={{ maxHeight: '50rem', overflowY: 'auto' }}>
              {pendingPolygons.map((_, idx) => {
                const color = PENDING_COLORS[idx % PENDING_COLORS.length]
                const usedPlotIds = new Set(
                  Object.entries(batchAssignments)
                    .filter(([k, v]) => v && parseInt(k) !== idx)
                    .map(([, v]) => v)
                )
                return (
                  <div key={idx} className="dash-form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.6rem',
                        height: '2.6rem',
                        borderRadius: '50%',
                        backgroundColor: color,
                        color: '#fff',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <select
                        className="dash-form-select"
                        value={batchAssignments[idx] ?? ''}
                        onChange={e => setBatchAssignments(prev => ({ ...prev, [idx]: e.target.value }))}
                      >
                        <option value="">Choose a plot...</option>
                        {unassignedPlots
                          .filter(p => !usedPlotIds.has(p.id) || batchAssignments[idx] === p.id)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.plot_number}</option>
                          ))
                        }
                        {plots
                          .filter(p => overlaidPlotIds.has(p.id) && (!usedPlotIds.has(p.id) || batchAssignments[idx] === p.id))
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.plot_number} (replace)</option>
                          ))
                        }
                      </select>
                    </div>
                    <button
                      className="dash-btn dash-btn--ghost dash-btn--sm"
                      onClick={() => removePendingPolygon(idx)}
                      title="Remove polygon"
                      style={{ padding: '0.2rem 0.6rem' }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}

              <p className="dash-form-hint" style={{ marginTop: '0.5rem' }}>
                {batchAssignedCount} of {pendingPolygons.length} assigned. Unassigned polygons will be discarded.
              </p>

              <div className="dash-form-actions">
                <button type="button" className="dash-btn" onClick={() => setAssigning(false)}>
                  Back to Drawing
                </button>
                <button type="button" className="dash-btn dash-btn--ghost" onClick={cancelDraw}>
                  Discard All
                </button>
                <button
                  type="button"
                  className="dash-btn dash-btn--primary"
                  onClick={handleSaveBatch}
                  disabled={batchAssignedCount === 0 || saving}
                >
                  {saving ? 'Saving...' : `Save ${batchAssignedCount} Overlay${batchAssignedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
