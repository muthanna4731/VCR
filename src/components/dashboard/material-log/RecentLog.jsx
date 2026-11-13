import { useEffect, useMemo, useRef, useState } from 'react'
import { formatINR, istDate, materialKey } from '../../../lib/materialLog'
import DateRangeFilter, { lastNDaysFrom, rangeLabel } from '../DateRangeFilter'

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

function RowMenu({ entry, canEdit, onEdit, onDelete, onHistory }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)

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

  // Hand focus back to the trigger first, so a modal opened from here returns focus to it.
  const run = fn => () => { btnRef.current?.focus(); setOpen(false); fn(entry) }

  return (
    <div className="dash-ml-menu" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="dash-ml-menu-btn"
        aria-label="Entry actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
      {open && (
        <div className="dash-ml-menu-list" role="menu">
          {canEdit && (
            <button type="button" role="menuitem" onClick={run(onEdit)}>
              <span className="material-symbols-outlined">edit</span>Edit
            </button>
          )}
          <button type="button" role="menuitem" onClick={run(onHistory)}>
            <span className="material-symbols-outlined">history</span>History
          </button>
          {canEdit && (
            <button type="button" role="menuitem" className="is-danger" onClick={run(onDelete)}>
              <span className="material-symbols-outlined">delete</span>Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * @param {{ canEdit?: boolean, defaultRange?: 'all' | 'last7' }} props
 *   canEdit: false hides Edit and Delete (owners read the log only).
 *   defaultRange: 'last7' opens on the latest 7 days; the date filter changes it.
 */
export default function RecentLog({ entries, sites, siteOptions, onEdit, onDelete, onHistory, highlightId, today: todayProp, canEdit = true, defaultRange = 'all' }) {
  const [siteFilter, setSiteFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const today = todayProp ?? istDate()
  const [from, setFrom] = useState(() => (defaultRange === 'last7' ? lastNDaysFrom(today, 7) : ''))
  const [to, setTo] = useState(() => (defaultRange === 'last7' ? today : ''))
  const [limit, setLimit] = useState(PAGE)
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
  const rangeWords = rangeLabel(from, to, today)

  const confirmDelete = entry => {
    if (!window.confirm('Delete this entry? It is removed from the log and totals, and the change is kept in its history.')) return
    onDelete(entry)
  }

  return (
    <section className="dash-ml-recent" aria-label="Recent entries">
      <div className="dash-ml-recent-head">
        <h2 className="dash-ml-title">Recent</h2>
        <div className="dash-ml-filters">
          <select className="dash-ml-input dash-ml-input--filter" aria-label="Filter by site" value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All sites</option>
            {siteOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="dash-ml-input dash-ml-input--filter" aria-label="Filter by material" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
            <option value="">All materials</option>
            {materials.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <DateRangeFilter
            from={from}
            to={to}
            today={today}
            onChange={r => { setFrom(r.from); setTo(r.to) }}
          />
          {filtering && (
            <button type="button" className="dash-ml-link" onClick={() => { setSiteFilter(''); setMaterialFilter(''); setFrom(''); setTo('') }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="dash-ml-muted dash-ml-recent-empty">
          {filtering
            ? (siteFilter || materialFilter ? 'No entries match these filters.' : `No entries in ${rangeWords === 'Any date' ? 'this range' : rangeWords}. Pick a wider date range to see older ones.`)
            : canEdit ? 'No entries yet. Log the first one above.' : 'No entries yet.'}
        </p>
      ) : (
        <ul className="dash-ml-rows">
          {visible.map(e => {
            const isNote = e.kind === 'note'
            const qty = e.quantity !== null && e.quantity !== undefined && e.quantity !== ''
              ? `${qtyFormat.format(Number(e.quantity))}${e.unit ? ` ${e.unit}` : ''}`
              : ''
            const extra = [e.vendor, !isNote && e.note].filter(Boolean).join(' · ')
            return (
              <li key={e.id} className={`dash-ml-row${e.id === highlightId ? ' is-new' : ''}`}>
                <span className="dash-ml-row-when">{whenLabel(e, today)}</span>
                <span className={`dash-ml-badge dash-ml-badge--${e.kind}`}>{KIND_LABEL[e.kind]}</span>
                <div className="dash-ml-row-main">
                  {isNote ? (
                    <span className="dash-ml-row-title">{e.note}</span>
                  ) : (
                    <span className="dash-ml-row-title">{e.material}{qty && <span className="dash-ml-row-qty"> {qty}</span>}</span>
                  )}
                  <span className="dash-ml-row-where">
                    {e.kind === 'out'
                      ? `${name(e.from_site_id) || 'Warehouse'} → ${name(e.site_id) || 'Unknown site'}`
                      : name(e.site_id)}
                  </span>
                  {extra && <span className="dash-ml-row-extra">{extra}</span>}
                </div>
                <span className="dash-ml-row-amount">{e.kind === 'in' && e.amount != null ? formatINR(e.amount) : ''}</span>
                <span className="dash-ml-row-by">{e.created_by_name || ''}</span>
                <RowMenu entry={e} canEdit={canEdit} onEdit={onEdit} onDelete={confirmDelete} onHistory={onHistory} />
              </li>
            )
          })}
        </ul>
      )}

      {filtered.length > limit && (
        <button type="button" className="dash-ml-btn dash-ml-btn--outline dash-ml-more" onClick={() => setLimit(l => l + PAGE)}>
          Show more ({filtered.length - limit} older)
        </button>
      )}
    </section>
  )
}
