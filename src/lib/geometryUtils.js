/**
 * Geometry utilities for polygon splitting (batch map / cake-cutter tool).
 *
 * All coordinates are percentage-based {x, y} matching the SVG viewBox 0–100.
 */

/* ─── Primitives ─── */

/** Euclidean distance between two points. */
export function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/**
 * Intersection of two finite line segments (a1→a2) and (b1→b2).
 * Returns { x, y, t, u } where t ∈ [0,1] is parameter on seg-a, u on seg-b.
 * Returns null when parallel or no intersection within both segments.
 */
export function segmentIntersection(a1, a2, b1, b2) {
  const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y
  const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y
  const denom = dx1 * dy2 - dy1 * dx2
  if (Math.abs(denom) < 1e-10) return null
  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom
  // Generous epsilon — snapped points may sit right on edges
  const EPS = 1e-4
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null
  return {
    x: parseFloat((a1.x + Math.max(0, Math.min(1, t)) * dx1).toFixed(2)),
    y: parseFloat((a1.y + Math.max(0, Math.min(1, t)) * dy1).toFixed(2)),
    t: Math.max(0, Math.min(1, t)),
    u: Math.max(0, Math.min(1, u)),
  }
}

/**
 * Project a point onto a line segment (a→b).
 * Returns { point, t, distance } where t ∈ [0,1] is the parameter on the segment.
 */
export function projectOnSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-10) return { point: { x: a.x, y: a.y }, t: 0, distance: dist(point, a) }
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const proj = {
    x: parseFloat((a.x + t * dx).toFixed(2)),
    y: parseFloat((a.y + t * dy).toFixed(2)),
  }
  return { point: proj, t, distance: dist(point, proj) }
}

/* ─── Edge snapping ─── */

/**
 * Find the closest point on any edge of any segment polygon to `cursor`.
 * Returns { point, segmentIndex, edgeIndex, t, distance } or null if none within threshold.
 */
export function snapToEdge(segments, cursor, threshold) {
  let best = null
  for (let si = 0; si < segments.length; si++) {
    const poly = segments[si]
    for (let ei = 0; ei < poly.length; ei++) {
      const a = poly[ei]
      const b = poly[(ei + 1) % poly.length]
      const { point, t, distance } = projectOnSegment(cursor, a, b)
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { point, segmentIndex: si, edgeIndex: ei, t, distance }
      }
    }
  }
  return best
}

/* ─── Polygon splitting ─── */

/**
 * Split a single polygon with a cut defined by entry/exit on its edges
 * plus optional intermediate points.
 *
 * @param {Array<{x,y}>} polygon       – the polygon vertices (CW or CCW)
 * @param {number}        entryEdgeIdx  – index of the edge the cut enters on
 * @param {{x,y}}         entryPoint    – exact point on that edge
 * @param {number}        exitEdgeIdx   – index of the edge the cut exits on
 * @param {{x,y}}         exitPoint     – exact point on that edge
 * @param {Array<{x,y}>}  intermediates – any intermediate cut vertices (between entry & exit)
 * @returns {[Array<{x,y}>, Array<{x,y}>]} two sub-polygons
 */
export function splitPolygon(polygon, entryEdgeIdx, entryPoint, exitEdgeIdx, exitPoint, intermediates = []) {
  const n = polygon.length

  // If entry and exit are on the same edge, we can't split
  if (entryEdgeIdx === exitEdgeIdx && intermediates.length === 0) return [polygon]

  const cutForward = [entryPoint, ...intermediates, exitPoint]
  const cutReverse = [...cutForward].reverse()

  // Polygon A: cut forward, then walk polygon from exit to entry
  const polyA = [...cutForward]
  let i = (exitEdgeIdx + 1) % n
  const stopA = (entryEdgeIdx + 1) % n
  let safety = n + 2
  while (i !== stopA && --safety > 0) {
    polyA.push({ x: polygon[i].x, y: polygon[i].y })
    i = (i + 1) % n
  }

  // Polygon B: cut reverse, then walk polygon from entry to exit
  const polyB = [...cutReverse]
  i = (entryEdgeIdx + 1) % n
  const stopB = (exitEdgeIdx + 1) % n
  safety = n + 2
  while (i !== stopB && --safety > 0) {
    polyB.push({ x: polygon[i].x, y: polygon[i].y })
    i = (i + 1) % n
  }

  return [polyA, polyB]
}

/**
 * Find all intersection points between a polyline (cut) and a polygon's edges.
 * The cut line is slightly extended beyond its endpoints to ensure clean crossings
 * for snapped points that sit exactly on edges.
 *
 * Returns array of { point, edgeIndex, cutSegIndex, t, cutT }
 * sorted by position along the cut polyline.
 */
function findCutPolygonIntersections(cutLine, polygon) {
  const hits = []
  for (let ci = 0; ci < cutLine.length - 1; ci++) {
    const c1 = cutLine[ci]
    const c2 = cutLine[ci + 1]
    for (let ei = 0; ei < polygon.length; ei++) {
      const p1 = polygon[ei]
      const p2 = polygon[(ei + 1) % polygon.length]
      const ix = segmentIntersection(c1, c2, p1, p2)
      if (!ix) continue
      // Deduplicate hits that land very close to each other
      const dup = hits.find(h => dist(h.point, ix) < 0.15)
      if (dup) continue
      hits.push({
        point: { x: ix.x, y: ix.y },
        edgeIndex: ei,
        cutSegIndex: ci,
        t: ix.u,
        cutT: ci + ix.t
      })
    }
  }
  hits.sort((a, b) => a.cutT - b.cutT)
  return hits
}

/**
 * Extract intermediate cut points that fall between two cut-line parameters.
 * These are the polyline vertices of the cut that lie inside the polygon.
 */
function extractIntermediates(cutLine, fromCutT, toCutT) {
  const pts = []
  const startSeg = Math.ceil(fromCutT)
  const endSeg = Math.floor(toCutT)
  for (let i = startSeg; i <= endSeg && i < cutLine.length; i++) {
    if (i > fromCutT + 1e-6 && i < toCutT - 1e-6) {
      pts.push({ x: cutLine[i].x, y: cutLine[i].y })
    }
  }
  return pts
}

/**
 * Extend a cut polyline slightly beyond its endpoints so that intersection
 * detection reliably finds crossings with polygon edges (avoids the "point
 * sits exactly on the edge" numerical issue).
 */
function extendCutLine(cutLine, epsilon = 0.15) {
  if (cutLine.length < 2) return cutLine
  const extended = cutLine.map(p => ({ x: p.x, y: p.y }))

  const first = cutLine[0], second = cutLine[1]
  const dxS = first.x - second.x, dyS = first.y - second.y
  const lenS = Math.sqrt(dxS * dxS + dyS * dyS)
  if (lenS > 0) {
    extended[0] = { x: first.x + (dxS / lenS) * epsilon, y: first.y + (dyS / lenS) * epsilon }
  }

  const last = cutLine[cutLine.length - 1], prev = cutLine[cutLine.length - 2]
  const dxE = last.x - prev.x, dyE = last.y - prev.y
  const lenE = Math.sqrt(dxE * dxE + dyE * dyE)
  if (lenE > 0) {
    extended[extended.length - 1] = { x: last.x + (dxE / lenE) * epsilon, y: last.y + (dyE / lenE) * epsilon }
  }

  return extended
}

/**
 * Apply a wall-to-wall cut across all segments.
 *
 * @param {Array<Array<{x,y}>>} segments      – current segment polygons
 * @param {Array<{x,y}>}        cutLine       – the cut polyline (≥ 2 points, snapped to edges)
 * @param {object}               startSnap    – { segmentIndex, edgeIndex, point } for cut start
 * @param {object}               endSnap      – { segmentIndex, edgeIndex, point } for cut end
 * @returns {Array<Array<{x,y}>>} new segments array with splits applied
 */
export function applyCut(segments, cutLine, startSnap, endSnap) {
  const result = []

  // Build the extended cut line for intersection detection on non-snap segments
  const extCut = extendCutLine(cutLine)

  for (let si = 0; si < segments.length; si++) {
    const poly = segments[si]

    const isStartSeg = startSnap.segmentIndex === si
    const isEndSeg = endSnap.segmentIndex === si

    // ── Case 1: Both start and end snap to THIS segment ──
    // Most common case — direct split, no intersection detection needed.
    if (isStartSeg && isEndSeg) {
      if (startSnap.edgeIndex === endSnap.edgeIndex && cutLine.length === 2) {
        // Same edge, no intermediates — can't split
        result.push(poly)
        continue
      }
      const intermediates = cutLine.length > 2 ? cutLine.slice(1, -1) : []
      const parts = splitPolygon(
        poly,
        startSnap.edgeIndex, startSnap.point,
        endSnap.edgeIndex, endSnap.point,
        intermediates
      )
      for (const p of parts) { if (p.length >= 3) result.push(p) }
      continue
    }

    // ── Case 2: Only start snaps here — we know entry, find exit via intersection ──
    if (isStartSeg) {
      const hits = findCutPolygonIntersections(extCut, poly)
      // Find the exit: last hit that isn't at the entry point
      const exit = [...hits].reverse().find(h => dist(h.point, startSnap.point) > 0.3)
      if (!exit) { result.push(poly); continue }
      const intermediates = extractIntermediates(cutLine, 0, exit.cutT)
      const parts = splitPolygon(poly, startSnap.edgeIndex, startSnap.point, exit.edgeIndex, exit.point, intermediates)
      for (const p of parts) { if (p.length >= 3) result.push(p) }
      continue
    }

    // ── Case 3: Only end snaps here — find entry via intersection, we know exit ──
    if (isEndSeg) {
      const hits = findCutPolygonIntersections(extCut, poly)
      // Find the entry: first hit that isn't at the exit point
      const entry = hits.find(h => dist(h.point, endSnap.point) > 0.3)
      if (!entry) { result.push(poly); continue }
      const intermediates = extractIntermediates(cutLine, entry.cutT, cutLine.length - 1)
      const parts = splitPolygon(poly, entry.edgeIndex, entry.point, endSnap.edgeIndex, endSnap.point, intermediates)
      for (const p of parts) { if (p.length >= 3) result.push(p) }
      continue
    }

    // ── Case 4: Neither start nor end snap here — pure intersection (middle segment) ──
    const hits = findCutPolygonIntersections(extCut, poly)
    if (hits.length < 2) {
      result.push(poly)
      continue
    }
    const entry = hits[0]
    const exit = hits[hits.length - 1]
    if (dist(entry.point, exit.point) < 0.2) { result.push(poly); continue }
    const intermediates = extractIntermediates(cutLine, entry.cutT, exit.cutT)
    const parts = splitPolygon(poly, entry.edgeIndex, entry.point, exit.edgeIndex, exit.point, intermediates)
    for (const p of parts) { if (p.length >= 3) result.push(p) }
  }

  return sortSegmentsSpatially(result)
}

/**
 * Sort segments in reading order: top-to-bottom rows, left-to-right within each row.
 * Segments whose centroids have similar y values (within tolerance) are treated as the same row.
 */
function sortSegmentsSpatially(segments) {
  if (segments.length <= 1) return segments

  const withCentroid = segments.map(seg => ({ seg, c: centroid(seg) }))

  const ys = withCentroid.map(s => s.c.y)
  const yRange = Math.max(...ys) - Math.min(...ys)
  const rowTolerance = Math.max(2, yRange * 0.15)

  withCentroid.sort((a, b) => a.c.y - b.c.y)

  const rows = []
  let currentRow = [withCentroid[0]]
  for (let i = 1; i < withCentroid.length; i++) {
    if (Math.abs(withCentroid[i].c.y - currentRow[0].c.y) <= rowTolerance) {
      currentRow.push(withCentroid[i])
    } else {
      rows.push(currentRow)
      currentRow = [withCentroid[i]]
    }
  }
  rows.push(currentRow)

  return rows.flatMap(row => {
    row.sort((a, b) => a.c.x - b.c.x)
    return row.map(s => s.seg)
  })
}

/** Centroid of a polygon (average of vertices). */
export function centroid(coords) {
  const x = coords.reduce((s, p) => s + p.x, 0) / coords.length
  const y = coords.reduce((s, p) => s + p.y, 0) / coords.length
  return { x, y }
}
