import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../../../css/material-log.css'
import { useMaterialLog } from '../../../hooks/useMaterialLog'
import { useAuth } from '../../../hooks/useAuth'
import { buildSiteOptions, computeAmount, istDate, materialOptions, summarize } from '../../../lib/materialLog'
import EntryForm from './EntryForm'
import HistoryModal from './HistoryModal'
import MaterialSummary from './MaterialSummary'
import Modal from './Modal'
import RecentLog from './RecentLog'

/* Only admins and managers log entries or change them. Owners read the log. */
const CAN_ENTER = new Set(['admin', 'manager'])

const MIGRATION_FILE = 'supabase/migrations/20261113120000_material_log.sql'

// Saved entry -> the form's shape, for the edit modal.
function toFormInitial(entry, siteOptions) {
  const valueFor = siteId => (siteId ? siteOptions.find(o => o.siteId === siteId)?.value ?? `site:${siteId}` : '')
  const str = v => (v === null || v === undefined ? '' : String(v))
  const stored = entry.amount
  // An amount that is just quantity x rate stays blank so it keeps following edits to either.
  const derived = stored != null && computeAmount({ quantity: entry.quantity, rate: entry.rate }) === Number(stored)
  return {
    kind: entry.kind,
    material: str(entry.material),
    siteValue: valueFor(entry.site_id),
    fromSiteValue: valueFor(entry.from_site_id),
    entryDate: entry.entry_date,
    quantity: str(entry.quantity),
    unit: entry.unit ?? '',
    rate: str(entry.rate),
    amount: derived ? '' : str(stored),
    vendor: str(entry.vendor),
    note: str(entry.note),
  }
}

export default function MaterialLog() {
  const log = useMaterialLog()
  const { profile } = useAuth()
  const canEnter = CAN_ENTER.has(profile?.role)
  const { status, error, entries, sites, layouts, reload, addEntry, updateEntry, deleteEntry, addSite, loadHistory } = log

  const [editing, setEditing] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [today, setToday] = useState(istDate)
  const highlightTimer = useRef(null)
  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  // Keep "Today" right when the tab stays open past midnight.
  useEffect(() => {
    const refresh = () => setToday(istDate())
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const siteOptions = useMemo(() => buildSiteOptions(layouts, sites), [layouts, sites])
  const materials = useMemo(() => materialOptions(entries), [entries])
  const summary = useMemo(() => summarize(entries, sites, today), [entries, sites, today])

  // An entry may point at a site that has since been archived: keep it selectable while editing.
  const editOptions = useMemo(() => {
    if (!editing) return siteOptions
    const extra = [editing.site_id, editing.from_site_id]
      .filter(id => id && !siteOptions.some(o => o.siteId === id))
      .map(id => ({ value: `site:${id}`, label: `${sites.find(s => s.id === id)?.name ?? 'Unknown site'} (archived)`, siteId: id }))
    return [...siteOptions, ...extra]
  }, [editing, siteOptions, sites])

  const handleAdd = useCallback(async form => {
    const row = await addEntry(form)
    setActionError('')
    setHighlightId(row.id)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600)
  }, [addEntry])

  const handleEdit = useCallback(async form => {
    await updateEntry(editing.id, form)
    setActionError('')
    setEditing(null)
  }, [editing, updateEntry])

  const handleDelete = useCallback(async entry => {
    try {
      await deleteEntry(entry.id)
      setActionError('')
    } catch (err) {
      setActionError(err?.message || 'Could not delete the entry. Try again.')
    }
  }, [deleteEntry])

  const closeEdit = useCallback(() => setEditing(null), [])
  const closeHistory = useCallback(() => setHistoryFor(null), [])

  if (status === 'loading') {
    return (
      <div className="dash-ml-root" aria-busy="true" aria-label="Loading material log">
        <div className="dash-glass dash-ml-card dash-ml-skeleton">
          <span className="dash-ml-sk dash-ml-sk--title" />
          <span className="dash-ml-sk dash-ml-sk--row" />
          <span className="dash-ml-sk dash-ml-sk--row" />
        </div>
        <div className="dash-ml-skeleton-tiles">
          <span className="dash-ml-sk dash-ml-sk--tile" /><span className="dash-ml-sk dash-ml-sk--tile" /><span className="dash-ml-sk dash-ml-sk--tile" />
        </div>
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="dash-ml-root">
        <div className="dash-glass dash-ml-card dash-ml-notice">
          <h2 className="dash-ml-title">Material log</h2>
          <p>
            Material log isn&apos;t set up yet. Run <code>{MIGRATION_FILE}</code> in the Supabase SQL editor.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="dash-ml-root">
        <div className="dash-glass dash-ml-card dash-ml-notice" role="alert">
          <h2 className="dash-ml-title">Material log</h2>
          <p>Could not load the material log{error?.message ? `: ${error.message}` : '.'}</p>
          <button type="button" className="dash-ml-btn dash-ml-btn--solid" onClick={reload}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-ml-root">
      {canEnter && (
        <div className="dash-glass dash-ml-card">
          <EntryForm
            siteOptions={siteOptions}
            materialOptions={materials}
            today={today}
            onSubmit={handleAdd}
            onAddSite={addSite}
          />
        </div>
      )}

      <MaterialSummary summary={summary} sites={sites} isEmpty={entries.length === 0} canEnter={canEnter} />

      {actionError && <div className="dash-ml-banner dash-ml-banner--error" role="alert">{actionError}</div>}

      <div className="dash-glass dash-ml-card">
        <RecentLog
          entries={entries}
          sites={sites}
          siteOptions={siteOptions}
          highlightId={highlightId}
          today={today}
          canEdit={canEnter}
          defaultRange={canEnter ? 'all' : 'last7'}
          onEdit={setEditing}
          onDelete={handleDelete}
          onHistory={setHistoryFor}
        />
      </div>

      {canEnter && editing && (
        <Modal title="Edit entry" onClose={closeEdit}>
          <EntryForm
            siteOptions={editOptions}
            materialOptions={materials}
            initial={toFormInitial(editing, editOptions)}
            onSubmit={handleEdit}
            onAddSite={addSite}
            onCancel={closeEdit}
          />
        </Modal>
      )}

      {historyFor && (
        <HistoryModal entry={historyFor} sites={sites} loadHistory={loadHistory} onClose={closeHistory} />
      )}
    </div>
  )
}
