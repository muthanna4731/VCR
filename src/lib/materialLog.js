// Pure calculations for the staff Material Log. No React, no Supabase.

export const MATERIALS = [
  'Cement', 'M-sand', 'P-sand', 'River sand', '20mm jelly', '40mm jelly', '12mm jelly',
  'Steel / TMT bars', 'Binding wire', 'Bricks', 'Solid blocks', 'Hollow blocks', 'Size stone',
  'Boulders', 'Red soil / Murram', 'Water tanker', 'Shuttering material', 'Electrical items',
  'Plumbing items', 'Paint', 'Tiles', 'Diesel', 'Miscellaneous',
]

export const UNITS = ['bags', 'tonnes', 'cft', 'brass', 'loads', 'trips', 'kg', 'nos', 'litres', 'sq ft', 'rft']

const MISC = 'Miscellaneous'

export function parseNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[,\s]/g, '')
  if (cleaned === '') return null
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned) ? Number(cleaned) : NaN
}

const isPositive = n => typeof n === 'number' && Number.isFinite(n) && n > 0

export function computeAmount({ quantity, rate, amount } = {}) {
  const typed = parseNumber(amount)
  if (isPositive(typed)) return typed
  const q = parseNumber(quantity)
  const r = parseNumber(rate)
  if (isPositive(q) && isPositive(r)) return Math.round(q * r * 100) / 100
  return null
}

export function validateEntry(entry = {}) {
  const { kind, material, siteId, fromSiteId, quantity, rate, amount, note } = entry
  const errors = {}
  const hasText = v => typeof v === 'string' && v.trim() !== ''

  for (const [field, raw] of [['quantity', quantity], ['rate', rate], ['amount', amount]]) {
    if (Number.isNaN(parseNumber(raw))) errors[field] = 'Enter a valid number'
  }

  if (kind === 'note') {
    if (!hasText(note)) errors.note = 'Write a note'
  } else if (kind === 'in' || kind === 'out') {
    if (!hasText(material)) errors.material = 'Choose a material'
    if (!hasText(siteId)) errors.siteId = 'Choose a site'
    if (material === MISC && !hasText(note)) errors.note = 'Add a note for Miscellaneous'

    if (kind === 'in') {
      if (!errors.amount && computeAmount({ quantity, rate, amount }) === null) {
        errors.amount = 'Enter an amount, or quantity and rate'
      }
    } else {
      if (!hasText(fromSiteId)) errors.fromSiteId = 'Choose where it came from'
      else if (hasText(siteId) && siteId === fromSiteId) errors.siteId = 'Pick a different site than the source'
      if (!errors.quantity && !isPositive(parseNumber(quantity))) errors.quantity = 'Enter a quantity'
    }
  } else {
    errors.kind = 'Choose In, Out or Note'
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

const istFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function istDate(date = new Date()) {
  return istFormatter.format(date)
}

export function materialKey(name) {
  return String(name ?? '').trim().toLowerCase()
}

const CANONICAL = new Map(MATERIALS.map(m => [materialKey(m), m]))

export function summarize(entries, sites, today) {
  const month = today.slice(0, 7)
  const siteName = new Map(sites.map(s => [s.id, s.name]))
  const warehouseIds = new Set(sites.filter(s => s.kind === 'warehouse').map(s => s.id))

  const displayNames = new Map() // materialKey -> display name
  const displayName = raw => {
    const key = materialKey(raw)
    if (!displayNames.has(key)) displayNames.set(key, CANONICAL.get(key) ?? String(raw).trim())
    return displayNames.get(key)
  }

  let todaySpend = 0
  let monthSpend = 0
  const bySiteMap = new Map()
  const byMaterial = new Map()
  const stock = new Map() // `${materialKey}|${unit}` -> { material, unit, quantity }

  const addStock = (raw, unit, delta) => {
    const key = `${materialKey(raw)}|${unit ?? ''}`
    const line = stock.get(key) ?? { material: displayName(raw), unit, quantity: 0 }
    line.quantity += delta
    stock.set(key, line)
  }

  for (const e of entries) {
    if (e.deleted_at || (e.kind !== 'in' && e.kind !== 'out') || !e.material) continue
    const quantity = Number(e.quantity)
    const hasQuantity = e.quantity !== null && e.quantity !== undefined && e.quantity !== '' && Number.isFinite(quantity)

    if (e.kind === 'in') {
      const amount = Number(e.amount)
      if (Number.isFinite(amount) && e.amount !== null && e.amount !== '') {
        if (e.entry_date === today) todaySpend += amount
        if (e.entry_date?.slice(0, 7) === month) {
          monthSpend += amount
          bySiteMap.set(e.site_id, (bySiteMap.get(e.site_id) ?? 0) + amount)
          const name = displayName(e.material)
          byMaterial.set(name, (byMaterial.get(name) ?? 0) + amount)
        }
      }
      if (hasQuantity && warehouseIds.has(e.site_id)) addStock(e.material, e.unit, quantity)
    } else if (e.kind === 'out') {
      if (hasQuantity && warehouseIds.has(e.from_site_id)) addStock(e.material, e.unit, -quantity)
    }
  }

  const desc = (a, b) => b.amount - a.amount
  return {
    todaySpend,
    monthSpend,
    bySite: [...bySiteMap].map(([siteId, amount]) => ({ siteId, name: siteName.get(siteId) ?? 'Unknown site', amount })).sort(desc),
    topMaterials: [...byMaterial].map(([material, amount]) => ({ material, amount })).sort(desc).slice(0, 5),
    warehouseStock: [...stock.values()].sort((a, b) => a.material.localeCompare(b.material) || String(a.unit).localeCompare(String(b.unit))),
  }
}

export function materialOptions(entries) {
  const seen = new Set(CANONICAL.keys())
  const custom = []
  for (const e of entries) {
    const name = String(e.material ?? '').trim()
    const key = materialKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    custom.push(name)
  }
  custom.sort((a, b) => a.localeCompare(b))
  const miscIndex = MATERIALS.indexOf(MISC)
  return [...MATERIALS.slice(0, miscIndex), ...custom, ...MATERIALS.slice(miscIndex)]
}

export function buildSiteOptions(layouts, sites) {
  const live = sites.filter(s => !s.archived)
  const warehouses = live.filter(s => s.kind === 'warehouse').map(s => ({
    value: `site:${s.id}`, label: s.name, siteId: s.id, layoutId: s.layout_id ?? null, kind: 'warehouse',
  }))
  const layoutOptions = layouts.map(l => {
    const linked = live.find(s => s.layout_id === l.id && s.kind !== 'warehouse')
    return { value: `layout:${l.id}`, label: l.name, siteId: linked?.id ?? null, layoutId: l.id, kind: 'layout' }
  })
  const privateSites = live.filter(s => s.kind !== 'warehouse' && !s.layout_id).map(s => ({
    value: `site:${s.id}`, label: s.name, siteId: s.id, layoutId: null, kind: 'site',
  }))
  return [...warehouses, ...layoutOptions, ...privateSites]
}

export function formatINR(n) {
  const num = Number(n)
  const whole = Number.isInteger(num)
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
}

export function formatINRCompact(n) {
  const num = Number(n)
  const abs = Math.abs(num)
  const trim = v => String(Math.round(v * 10) / 10)
  if (abs >= 1e7) return `₹${trim(num / 1e7)} Cr`
  if (abs >= 1e5) return `₹${trim(num / 1e5)} L`
  return formatINR(num)
}

export function isMissingTableError(err) {
  if (!err) return false
  if (['42P01', 'PGRST205', 'PGRST202'].includes(err.code)) return true
  return /does not exist|schema cache/i.test(err.message ?? '')
}
