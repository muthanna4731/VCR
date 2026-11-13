import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* Dates are plain 'YYYY-MM-DD' strings throughout, the same shape as
   entry_date, so they compare as strings. Math runs in UTC on purpose:
   it only shifts calendar days and never touches the local time zone. */
function shift(day, days) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** First day of the last `n` days ending today (n = 7 gives today and the 6 days before). */
export function lastNDaysFrom(today, n) {
  return shift(today, -(n - 1))
}

function monthStart(day, monthsBack = 0) {
  const [y, m] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - monthsBack, 1)).toISOString().slice(0, 10)
}

function presetsFor(today) {
  const thisMonth = monthStart(today)
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: shift(today, -1), to: shift(today, -1) },
    { label: 'Last 7 days', from: shift(today, -6), to: today },
    { label: 'Last 30 days', from: shift(today, -29), to: today },
    { label: 'This month', from: thisMonth, to: today },
    { label: 'Last month', from: monthStart(today, 1), to: shift(thisMonth, -1) },
  ]
}

const short = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const withYear = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function fmt(day, today) {
  const date = new Date(`${day}T00:00:00Z`)
  return (day.slice(0, 4) === today.slice(0, 4) ? short : withYear).format(date)
}

/** Words for the current range: a preset name when it matches one, else the dates. */
export function rangeLabel(from, to, today) {
  if (!from && !to) return 'Any date'
  const preset = presetsFor(today).find(p => p.from === from && p.to === to)
  if (preset) return preset.label
  if (from && to) return from === to ? fmt(from, today) : `${fmt(from, today)} – ${fmt(to, today)}`
  if (from) return `From ${fmt(from, today)}`
  return `Up to ${fmt(to, today)}`
}

/**
 * One button that names the chosen range ("Last 7 days", "3 Nov – 9 Nov").
 * Opens a panel with one-tap ranges and a labelled From / To for anything else.
 *
 * @param {{ from: string, to: string, today: string,
 *           onChange: (range: { from: string, to: string }) => void }} props
 */
export default function DateRangeFilter({ from, to, today, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const [pos, setPos] = useState(null)
  const panelId = useId()
  const presets = presetsFor(today)
  const active = !!(from || to)

  useEffect(() => {
    if (!open) return undefined
    const onDown = e => {
      if (!ref.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // The panel lives in a portal on <body> with fixed positioning, so no card's
  // overflow or stacking context can hide it. It opens below the button, or
  // above when there isn't room, and follows the button on scroll and resize.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined }
    const place = () => {
      const btn = btnRef.current
      const panel = panelRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const gap = 6
      const margin = 12
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.min(360, vw - margin * 2)
      const height = panel?.offsetHeight ?? 0
      let left = Math.min(r.right - width, vw - margin - width)
      left = Math.max(margin, left)
      const below = r.bottom + gap
      const fitsBelow = below + height <= vh - margin
      const top = fitsBelow || r.top - gap - height < margin ? below : r.top - gap - height
      setPos({ top, left, width })
    }
    place()
    const raf = requestAnimationFrame(place) // again once the panel has a height
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const pick = range => {
    onChange(range)
    setOpen(false)
    btnRef.current?.focus()
  }

  // Typing a From after the To (or the reverse) moves the other end with it,
  // so the range is never upside down.
  const setFrom = value => onChange({ from: value, to: to && value && value > to ? value : to })
  const setTo = value => onChange({ from: from && value && value < from ? value : from, to: value })

  return (
    <div className="dash-range" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className={`dash-range-btn${active ? ' is-active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
        <span className="dash-range-btn-text">{rangeLabel(from, to, today)}</span>
        <span className="material-symbols-outlined dash-range-caret" aria-hidden="true">expand_more</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="dash-range-panel"
          id={panelId}
          role="dialog"
          aria-label="Choose dates"
          style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: 'hidden' }}
        >
          <div className="dash-range-presets">
            <button
              type="button"
              className={`dash-range-chip${!active ? ' is-on' : ''}`}
              aria-pressed={!active}
              onClick={() => pick({ from: '', to: '' })}
            >
              Any date
            </button>
            {presets.map(p => {
              const on = p.from === from && p.to === to
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`dash-range-chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => pick({ from: p.from, to: p.to })}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="dash-range-custom">
            <label className="dash-range-field">
              <span>From</span>
              <input type="date" className="dash-ml-input" value={from} max={today} onChange={e => setFrom(e.target.value)} />
            </label>
            <label className="dash-range-field">
              <span>To</span>
              <input type="date" className="dash-ml-input" value={to} max={today} onChange={e => setTo(e.target.value)} />
            </label>
          </div>

          <div className="dash-range-foot">
            {active && (
              <button type="button" className="dash-ml-link" onClick={() => onChange({ from: '', to: '' })}>
                Clear dates
              </button>
            )}
            <button type="button" className="dash-range-done" onClick={() => { setOpen(false); btnRef.current?.focus() }}>
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
