import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../../../css/material-log.css'
import { useMaterialLog } from '../../../hooks/useMaterialLog'
import { buildSiteOptions, computeAmount, istDate, materialOptions, summarize } from '../../../lib/materialLog'
import EntryForm from './EntryForm'
import HistoryModal from './HistoryModal'
import MaterialSummary from './MaterialSummary'
import Modal from './Modal'
import RecentLog from './RecentLog'

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
  const { status, error, entries, sites, layouts, reload, addEntry, updateEntry, deleteEntry, addSite, loadHistory } = log

  const [editing, setEditing] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [actionError, setActionError] = useState('')
  const highlightTimer = useRef(null)
  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  const siteOptions = useMemo(() => buildSiteOptions(layouts, sites), [layouts, sites])
  const materials = useMemo(() => materialOptions(entries), [entries])
  const summary = useMemo(() => summarize(entries, sites, istDate()), [entries, sites])

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
      <div className="ml-root" aria-busy="true" aria-label="Loading material log">
        <div className="dash-glass ml-card ml-skeleton">
          <span className="ml-sk ml-sk--title" />
          <span className="ml-sk ml-sk--row" />
          <span className="ml-sk ml-sk--row" />
        </div>
        <div className="ml-skeleton-tiles">
          <span className="ml-sk ml-sk--tile" /><span className="ml-sk ml-sk--tile" /><span className="ml-sk ml-sk--tile" />
        </div>
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="ml-root">
        <div className="dash-glass ml-card ml-notice">
          <h2 className="ml-title">Material log</h2>
          <p>
            Material log isn&apos;t set up yet. Run <code>{MIGRATION_FILE}</code> in the Supabase SQL editor.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ml-root">
        <div className="dash-glass ml-card ml-notice" role="alert">
          <h2 className="ml-title">Material log</h2>
          <p>Could not load the material log{error?.message ? `: ${error.message}` : '.'}</p>
          <button type="button" className="ml-btn ml-btn--solid" onClick={reload}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ml-root">
      <div className="dash-glass ml-card">
        <EntryForm
          siteOptions={siteOptions}
          materialOptions={materials}
          onSubmit={handleAdd}
          onAddSite={addSite}
        />
      </div>

      <MaterialSummary summary={summary} sites={sites} isEmpty={entries.length === 0} />

      {actionError && <div className="ml-banner ml-banner--error" role="alert">{actionError}</div>}

      <div className="dash-glass ml-card">
        <RecentLog
          entries={entries}
          sites={sites}
          siteOptions={siteOptions}
          highlightId={highlightId}
          onEdit={setEditing}
          onDelete={handleDelete}
          onHistory={setHistoryFor}
        />
      </div>

      {editing && (
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
