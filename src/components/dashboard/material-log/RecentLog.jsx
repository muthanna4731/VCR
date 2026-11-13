import { useEffect, useMemo, useRef, useState } from 'react'
import { formatINR, istDate, materialKey } from '../../../lib/materialLog'

const PAGE = 30
const KIND_LABEL = { in: 'IN', out: 'OUT', note: 'NOTE' }
const qtyFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
})
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

function whenLabel(entry, today) {
  if (entry.entry_date === today && entry.created_at) return timeFormat.format(new Date(entry.created_at))
  const [y, m, d] = String(entry.entry_date).split('-').map(Number)
  return dateFormat.format(new Date(y, m - 1, d))
}

function RowMenu({ entry, onEdit, onDelete, onHistory }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = fn => () => { setOpen(false); fn(entry) }

  return (
    <div className="ml-menu" ref={ref}>
      <button
        type="button"
        className="ml-menu-btn"
        aria-label="Entry actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
      {open && (
        <div className="ml-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={run(onEdit)}>
            <span className="material-symbols-outlined">edit</span>Edit
          </button>
          <button type="button" role="menuitem" onClick={run(onHistory)}>
            <span className="material-symbols-outlined">history</span>History
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={run(onDelete)}>
            <span className="material-symbols-outlined">delete</span>Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function RecentLog({ entries, sites, siteOptions, onEdit, onDelete, onHistory, highlightId }) {
  const [siteFilter, setSiteFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const today = istDate()
  const siteName = useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites])
  const name = id => (id ? siteName.get(id) ?? 'Unknown site' : '')

  const materials = useMemo(() => {
    const seen = new Map()
    for (const e of entries) {
      const key = materialKey(e.material)
      if (key && !seen.has(key)) seen.set(key, String(e.material).trim())
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [entries])

  const filtered = useMemo(() => {
    const siteIds = siteFilter ? siteOptions.find(o => o.value === siteFilter)?.siteId : null
    const mKey = materialKey(materialFilter)
    return entries.filter(e => {
      if (siteFilter && (!siteIds || (e.site_id !== siteIds && e.from_site_id !== siteIds))) return false
      if (mKey && materialKey(e.material) !== mKey) return false
      if (from && e.entry_date < from) return false
      if (to && e.entry_date > to) return false
      return true
    })
  }, [entries, siteOptions, siteFilter, materialFilter, from, to])

  const filterKey = `${siteFilter}|${materialFilter}|${from}|${to}`
  useEffect(() => { setLimit(PAGE) }, [filterKey])

  const visible = filtered.slice(0, limit)
  const filtering = !!(siteFilter || materialFilter || from || to)

  const confirmDelete = entry => {
    if (!window.confirm('Delete this entry? It is removed from the log and totals, and the change is kept in its history.')) return
    onDelete(entry)
  }

  return (
    <section className="ml-recent" aria-label="Recent entries">
      <div className="ml-recent-head">
        <h2 className="ml-title">Recent</h2>
        <div className="ml-filters">
          <select className="ml-input ml-input--filter" aria-label="Filter by site" value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All sites</option>
            {siteOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="ml-input ml-input--filter" aria-label="Filter by material" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
            <option value="">All materials</option>
            {materials.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="ml-input ml-input--filter" type="date" aria-label="From date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
          <input className="ml-input ml-input--filter" type="date" aria-label="To date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          {filtering && (
            <button type="button" className="ml-link" onClick={() => { setSiteFilter(''); setMaterialFilter(''); setFrom(''); setTo('') }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="ml-muted ml-recent-empty">
          {filtering ? 'No entries match these filters.' : 'No entries yet. Log the first one above.'}
        </p>
      ) : (
        <ul className="ml-rows">
          {visible.map(e => {
            const isNote = e.kind === 'note'
            const qty = e.quantity !== null && e.quantity !== undefined && e.quantity !== ''
              ? `${qtyFormat.format(Number(e.quantity))}${e.unit ? ` ${e.unit}` : ''}`
              : ''
            const extra = [e.vendor, !isNote && e.note].filter(Boolean).join(' · ')
            return (
              <li key={e.id} className={`ml-row${e.id === highlightId ? ' is-new' : ''}`}>
                <span className="ml-row-when">{whenLabel(e, today)}</span>
                <span className={`ml-badge ml-badge--${e.kind}`}>{KIND_LABEL[e.kind]}</span>
                <div className="ml-row-main">
                  {isNote ? (
                    <span className="ml-row-title">{e.note}</span>
                  ) : (
                    <span className="ml-row-title">{e.material}{qty && <span className="ml-row-qty"> {qty}</span>}</span>
                  )}
                  <span className="ml-row-where">
                    {e.kind === 'out'
                      ? `${name(e.from_site_id) || 'Warehouse'} → ${name(e.site_id) || 'Unknown site'}`
                      : name(e.site_id)}
                  </span>
                  {extra && <span className="ml-row-extra">{extra}</span>}
                </div>
                <span className="ml-row-amount">{e.kind === 'in' && e.amount != null ? formatINR(e.amount) : ''}</span>
                <span className="ml-row-by">{e.created_by_name || ''}</span>
                <RowMenu entry={e} onEdit={onEdit} onDelete={confirmDelete} onHistory={onHistory} />
              </li>
            )
          })}
        </ul>
      )}

      {filtered.length > limit && (
        <button type="button" className="ml-btn ml-btn--outline ml-more" onClick={() => setLimit(l => l + PAGE)}>
          Show more ({filtered.length - limit} older)
        </button>
      )}
    </section>
  )
}
