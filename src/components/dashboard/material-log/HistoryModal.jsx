import { useEffect, useState } from 'react'
import { formatINR } from '../../../lib/materialLog'
import Modal from './Modal'

const HIDDEN = new Set(['id', 'created_at', 'updated_at', 'created_by', 'created_by_name'])
const LABELS = {
  site_id: 'site', from_site_id: 'from', entry_date: 'date', deleted_at: 'deleted',
}
const ACTIONS = { create: 'Added', edit: 'Edited', delete: 'Deleted' }

const when = iso => new Date(iso).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})

export default function HistoryModal({ entry, sites, loadHistory, onClose }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    loadHistory(entry.id)
      .then(r => { if (alive) setRows(r) })
      .catch(err => { if (alive) setError(err?.message || 'Could not load the history') })
    return () => { alive = false }
  }, [entry.id, loadHistory])

  const siteName = id => sites.find(s => s.id === id)?.name ?? 'Unknown site'
  const show = (field, v) => {
    if (v === null || v === undefined || v === '') return 'empty'
    if (field === 'site_id' || field === 'from_site_id') return siteName(v)
    if (field === 'amount' || field === 'rate') return formatINR(v)
    return String(v)
  }

  const changes = row => {
    const before = row.before ?? {}
    const after = row.after ?? {}
    return Object.keys(after)
      .filter(k => !HIDDEN.has(k) && JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
      .map(k => `${LABELS[k] ?? k}: ${show(k, before[k])} → ${show(k, after[k])}`)
  }

  return (
    <Modal title="Change history" onClose={onClose}>
      {error && <div className="dash-ml-banner dash-ml-banner--error" role="alert">{error}</div>}
      {!error && rows === null && <p className="dash-ml-muted">Loading…</p>}
      {rows && rows.length === 0 && <p className="dash-ml-muted">No changes recorded for this entry.</p>}
      {rows && rows.length > 0 && (
        <ol className="dash-ml-history">
          {rows.map(row => (
            <li key={row.id}>
              <div className="dash-ml-history-head">
                <strong>{ACTIONS[row.action] ?? row.action}</strong>
                <span>by {row.changed_by_name || 'Unknown'}, {when(row.changed_at)}</span>
              </div>
              {row.action === 'edit' && (
                <ul className="dash-ml-history-changes">
                  {changes(row).map(c => <li key={c}>{c}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
