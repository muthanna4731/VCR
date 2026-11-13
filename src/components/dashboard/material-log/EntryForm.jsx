import { useEffect, useMemo, useRef, useState } from 'react'
import {
  UNITS, computeAmount, formatINR, istDate, materialKey, validateEntry,
} from '../../../lib/materialLog'

const OTHER = '__other__'
const NEW_SITE = '__new_site__'

const KINDS = [
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'note', label: 'Note' },
]

const UNIT_KEY = 'vcr.ml.unit.'
const SITE_KEY = 'vcr.ml.site'

function readStore(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}
function writeStore(key, value) {
  try { window.localStorage.setItem(key, value) } catch { /* private mode, ignore */ }
}

// Fallback unit when nothing was used before for that material.
function defaultUnit(material) {
  const key = materialKey(material)
  if (/cement/.test(key)) return 'bags'
  if (/sand|jelly|boulder|soil|murram/.test(key)) return 'loads'
  if (/steel|tmt|wire/.test(key)) return 'kg'
  if (/tanker/.test(key)) return 'trips'
  if (/diesel|paint/.test(key)) return 'litres'
  if (/tile/.test(key)) return 'sq ft'
  return 'nos'
}

function unitFor(material) {
  const key = materialKey(material)
  if (!key) return 'nos'
  return readStore(UNIT_KEY + key) || defaultUnit(material)
}

function hasOption(options, value) {
  return !!value && options.some(o => o.value === value)
}

function initialState({ initial, siteOptions, materialOptions }) {
  const warehouse = siteOptions.find(o => o.kind === 'warehouse')?.value ?? ''
  const remembered = readStore(SITE_KEY)
  const material = initial?.material ?? ''
  return {
    kind: initial?.kind ?? 'in',
    material,
    otherMode: !!material && !materialOptions.includes(material),
    siteValue: initial ? (initial.siteValue ?? '') : (hasOption(siteOptions, remembered) ? remembered : ''),
    fromSiteValue: initial ? (initial.fromSiteValue ?? warehouse) : warehouse,
    entryDate: initial?.entryDate ?? istDate(),
    quantity: initial?.quantity ?? '',
    unit: initial?.unit || unitFor(material),
    rate: initial?.rate ?? '',
    amount: initial?.amount ?? '',
    vendor: initial?.vendor ?? '',
    note: initial?.note ?? '',
  }
}

function Field({ label, error, className = '', children }) {
  return (
    <label className={`ml-field ${className}`}>
      <span className="ml-label">{label}</span>
      {children}
      {error && <span className="ml-error" role="alert">{error}</span>}
    </label>
  )
}

export default function EntryForm({ siteOptions, materialOptions, initial, onSubmit, onAddSite, onCancel }) {
  const editing = !!initial
  const [f, setF] = useState(() => initialState({ initial, siteOptions, materialOptions }))
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [showMore, setShowMore] = useState(() => !!(initial?.vendor || initial?.note))
  const [newSite, setNewSite] = useState(null) // { target: 'siteValue' | 'fromSiteValue', name }
  const [addingSite, setAddingSite] = useState(false)
  const [siteError, setSiteError] = useState('')

  const materialRef = useRef(null)
  const otherRef = useRef(null)
  const noteRef = useRef(null)
  const newSiteRef = useRef(null)
  const focusOther = useRef(false)
  const submitLock = useRef(false)

  const set = patch => setF(prev => ({ ...prev, ...patch }))

  useEffect(() => {
    if (f.otherMode && focusOther.current) {
      focusOther.current = false
      otherRef.current?.focus()
    }
  }, [f.otherMode])

  useEffect(() => { if (newSite) newSiteRef.current?.focus() }, [newSite?.target]) // eslint-disable-line react-hooks/exhaustive-deps

  const isIn = f.kind === 'in'
  const isOut = f.kind === 'out'
  const isNote = f.kind === 'note'

  // Only the fields the current kind shows are validated and sent.
  const payload = useMemo(() => ({
    kind: f.kind,
    siteValue: f.siteValue,
    fromSiteValue: isOut ? f.fromSiteValue : '',
    entryDate: f.entryDate,
    material: isNote ? '' : f.material.trim(),
    quantity: isNote ? '' : f.quantity,
    unit: isNote ? '' : f.unit,
    rate: isIn ? f.rate : '',
    amount: isIn ? f.amount : '',
    vendor: isIn ? f.vendor : '',
    note: f.note,
  }), [f, isIn, isOut, isNote])

  const errors = useMemo(
    () => validateEntry({ ...payload, siteId: payload.siteValue, fromSiteId: payload.fromSiteValue }).errors,
    [payload],
  )
  const shown = attempted ? errors : {}
  const dateError = attempted && !f.entryDate ? 'Pick a date' : ''
  const computed = isIn ? computeAmount({ quantity: f.quantity, rate: f.rate }) : null

  const unitOptions = UNITS.includes(f.unit) ? UNITS : [f.unit, ...UNITS]
  const showNoteField = isOut || isNote
  // Vendor / note panel: note is hidden for In until opened, but Miscellaneous needs one.
  const moreOpen = showMore || (attempted && isIn && !!errors.note)

  function pickMaterial(value) {
    if (value === OTHER) {
      focusOther.current = true
      set({ otherMode: true, material: '' })
      return
    }
    set({ otherMode: false, material: value, unit: value ? unitFor(value) : f.unit })
  }

  function pickSite(target, value) {
    if (value === NEW_SITE) {
      setSiteError('')
      setNewSite({ target, name: '' })
      return
    }
    setNewSite(null)
    set({ [target]: value })
  }

  async function addSite() {
    const name = newSite?.name.trim()
    if (!name) { setSiteError('Enter a site name'); return }
    setAddingSite(true)
    setSiteError('')
    try {
      const site = await onAddSite(name)
      set({ [newSite.target]: `site:${site.id}` })
      setNewSite(null)
    } catch (err) {
      setSiteError(err?.message || 'Could not add the site')
    } finally {
      setAddingSite(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (submitLock.current) return
    setAttempted(true)
    setFormError('')
    if (newSite) { setSiteError('Add the new site first, or choose another'); return }
    if (Object.keys(errors).length > 0 || !f.entryDate) return

    submitLock.current = true
    setSubmitting(true)
    try {
      await onSubmit(payload)
      if (payload.material && payload.unit) writeStore(UNIT_KEY + materialKey(payload.material), payload.unit)
      if (payload.siteValue && !editing) writeStore(SITE_KEY, payload.siteValue)
      if (!editing) {
        // Keep kind, site and date: people log several items for the same site in a row.
        setF(prev => ({
          ...prev, material: '', otherMode: false, quantity: '', rate: '', amount: '', vendor: '', note: '',
        }))
        setAttempted(false)
        setShowMore(false)
        ;(isNote ? noteRef : materialRef).current?.focus()
      }
    } catch (err) {
      setFormError(err?.message || 'Could not save. Check your connection and try again.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  const siteSelect = (target, label, error, extra) => (
    <div className="ml-field">
      <label className="ml-label" htmlFor={`ml-${target}`}>{label}</label>
      {newSite?.target === target ? (
        <div className="ml-inline-add">
          <input
            ref={newSiteRef}
            className="ml-input"
            type="text"
            placeholder="New site name"
            aria-label="New site name"
            value={newSite.name}
            onChange={e => setNewSite({ ...newSite, name: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addSite() }
              if (e.key === 'Escape') setNewSite(null)
            }}
          />
          <button type="button" className="ml-btn ml-btn--solid" onClick={addSite} disabled={addingSite}>
            {addingSite ? 'Adding…' : 'Add'}
          </button>
          <button type="button" className="ml-btn ml-btn--quiet" onClick={() => setNewSite(null)} aria-label="Cancel new site">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : (
        <select
          id={`ml-${target}`}
          className="ml-input"
          value={f[target]}
          onChange={e => pickSite(target, e.target.value)}
          aria-invalid={!!error}
        >
          <option value="">{extra || 'Choose site'}</option>
          {siteOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value={NEW_SITE}>+ New site…</option>
        </select>
      )}
      {newSite?.target === target && siteError && <span className="ml-error" role="alert">{siteError}</span>}
      {error && newSite?.target !== target && <span className="ml-error" role="alert">{error}</span>}
    </div>
  )

  const materialField = (
    <div className="ml-field">
      <label className="ml-label" htmlFor="ml-material">Material</label>
      <select
        id="ml-material"
        ref={materialRef}
        className="ml-input"
        value={f.otherMode ? OTHER : f.material}
        onChange={e => pickMaterial(e.target.value)}
        aria-invalid={!!shown.material}
      >
        <option value="">Choose material</option>
        {materialOptions.map(m => <option key={m} value={m}>{m}</option>)}
        <option value={OTHER}>Other…</option>
      </select>
      {f.otherMode && (
        <input
          ref={otherRef}
          className="ml-input ml-input--stacked"
          type="text"
          placeholder="Material name"
          aria-label="Material name"
          value={f.material}
          onChange={e => set({ material: e.target.value })}
          aria-invalid={!!shown.material}
        />
      )}
      {shown.material && <span className="ml-error" role="alert">{shown.material}</span>}
    </div>
  )

  const dateField = (
    <Field label="Date" error={dateError}>
      <input
        className="ml-input"
        type="date"
        value={f.entryDate}
        onChange={e => set({ entryDate: e.target.value })}
      />
    </Field>
  )

  const quantityField = (
    <div className="ml-field">
      <label className="ml-label" htmlFor="ml-qty">Quantity</label>
      <div className="ml-qty">
        <input
          id="ml-qty"
          className="ml-input"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={f.quantity}
          onChange={e => set({ quantity: e.target.value })}
          aria-invalid={!!shown.quantity}
        />
        <select
          className="ml-input"
          aria-label="Unit"
          value={f.unit}
          onChange={e => set({ unit: e.target.value })}
        >
          {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {(shown.quantity || shown.unit) && <span className="ml-error" role="alert">{shown.quantity || shown.unit}</span>}
    </div>
  )

  return (
    <form className={`ml-form ml-form--${f.kind}`} onSubmit={submit} noValidate>
      <div className="ml-form-head">
        {!editing && <h2 className="ml-title">Material log</h2>}
        <div className="ml-kinds" role="group" aria-label="Entry type">
          {KINDS.map(k => (
            <button
              key={k.value}
              type="button"
              className={`ml-kind ml-kind--${k.value}`}
              aria-pressed={f.kind === k.value}
              onClick={() => set({ kind: k.value })}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-grid">
        {isIn && (<>
          {materialField}
          {siteSelect('siteValue', 'Site', shown.siteId)}
          {dateField}
          {quantityField}
          <Field label="Rate" error={shown.rate}>
            <span className="ml-money">
              <span className="ml-money-sign" aria-hidden="true">₹</span>
              <input
                className="ml-input"
                type="text"
                inputMode="decimal"
                placeholder="per unit"
                value={f.rate}
                onChange={e => set({ rate: e.target.value })}
                aria-invalid={!!shown.rate}
              />
            </span>
          </Field>
          <Field label="Amount" error={shown.amount}>
            <span className="ml-money">
              <span className="ml-money-sign" aria-hidden="true">₹</span>
              <input
                className="ml-input"
                type="text"
                inputMode="decimal"
                placeholder={computed ? formatINR(computed).slice(1) : 'total'}
                value={f.amount}
                onChange={e => set({ amount: e.target.value })}
                aria-invalid={!!shown.amount}
              />
            </span>
          </Field>
        </>)}

        {isOut && (<>
          {materialField}
          {siteSelect('fromSiteValue', 'From', shown.fromSiteId, 'Choose source')}
          {siteSelect('siteValue', 'To site', shown.siteId)}
          {dateField}
          {quantityField}
        </>)}

        {isNote && (<>
          <Field label="Note" error={shown.note} className="ml-span-all">
            <textarea
              ref={noteRef}
              className="ml-input ml-textarea"
              rows={3}
              placeholder="Slab poured, Block A"
              value={f.note}
              onChange={e => set({ note: e.target.value })}
              aria-invalid={!!shown.note}
            />
          </Field>
          {siteSelect('siteValue', 'Site (optional)', shown.siteId)}
          {dateField}
        </>)}

        {isOut && (
          <Field label="Note (optional)" error={shown.note} className="ml-span-all">
            <input
              className="ml-input"
              type="text"
              value={f.note}
              onChange={e => set({ note: e.target.value })}
              aria-invalid={!!shown.note}
            />
          </Field>
        )}

        {isIn && moreOpen && (<>
          <Field label="Vendor">
            <input className="ml-input" type="text" value={f.vendor} onChange={e => set({ vendor: e.target.value })} />
          </Field>
          <Field label="Note" error={shown.note} className="ml-span-2">
            <input
              className="ml-input"
              type="text"
              value={f.note}
              onChange={e => set({ note: e.target.value })}
              aria-invalid={!!shown.note}
            />
          </Field>
        </>)}
      </div>

      {formError && <div className="ml-banner ml-banner--error" role="alert">{formError}</div>}

      <div className="ml-form-foot">
        {isIn && !moreOpen
          ? <button type="button" className="ml-link" onClick={() => setShowMore(true)}>+ vendor / note</button>
          : <span />}
        <div className="ml-actions">
          {onCancel && <button type="button" className="ml-btn ml-btn--quiet ml-btn--text" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="ml-btn ml-btn--solid ml-btn--log" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Log'}
          </button>
        </div>
      </div>
    </form>
  )
}
