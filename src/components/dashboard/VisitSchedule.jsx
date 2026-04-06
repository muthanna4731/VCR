import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const VISIT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

const VISIT_STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#c77700', bg: '#fff8e1', border: '#ffe08a' },
  confirmed: { label: 'Confirmed', color: '#046ebc', bg: '#f0f7ff', border: '#cce3f8' },
  completed: { label: 'Completed', color: '#34c759', bg: '#f0fff4', border: '#b7f5c4' },
  cancelled: { label: 'Cancelled', color: '#8e8e93', bg: '#f5f5f7', border: '#e5e5ea' },
}

const NEXT_ACTIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const ACTION_LABELS = {
  confirmed: 'Confirm',
  completed: 'Mark Complete',
  cancelled: 'Cancel',
}

const EMPTY_FORM = {
  layout_id: '',
  agent_id: '',
  visitor_name: '',
  visitor_phone: '',
  scheduled_at: '',
  notes: '',
}

function NewVisitModal({ layouts, agents, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.layout_id) { setError('Please select a layout.'); return }
    if (!form.visitor_name.trim()) { setError('Visitor name is required.'); return }
    if (!form.visitor_phone.trim()) { setError('Visitor phone is required.'); return }
    if (!form.scheduled_at) { setError('Please pick a date and time.'); return }

    setSaving(true)
    setError(null)
    try {
      await runSupabaseMutation(
        () => supabase.from('visit_schedules').insert({
          layout_id:     form.layout_id,
          agent_id:      form.agent_id || null,
          visitor_name:  form.visitor_name.trim(),
          visitor_phone: form.visitor_phone.trim(),
          scheduled_at:  form.scheduled_at,
          notes:         form.notes.trim() || null,
          status:        'pending',
        }),
        { label: 'Create visit schedule' }
      )
      onSave()
    } catch (err) {
      setError(err.message); setSaving(false)
    }
  }

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label="Schedule Visit">
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">Schedule a Visit</h2>
          <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}
          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Visitor Name *</label>
              <input className="dash-form-input" name="visitor_name" value={form.visitor_name} onChange={handleChange} placeholder="Full name" required />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Visitor Phone *</label>
              <input className="dash-form-input" name="visitor_phone" value={form.visitor_phone} onChange={handleChange} placeholder="+91 98765 43210" required />
            </div>
          </div>
          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Layout *</label>
              <select className="dash-form-select" name="layout_id" value={form.layout_id} onChange={handleChange} required>
                <option value="">Select layout…</option>
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Assign Agent</label>
              <select className="dash-form-select" name="agent_id" value={form.agent_id} onChange={handleChange}>
                <option value="">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Date & Time *</label>
            <input className="dash-form-input" type="datetime-local" name="scheduled_at" value={form.scheduled_at} onChange={handleChange} required />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Notes</label>
            <textarea className="dash-form-textarea" name="notes" value={form.notes} onChange={handleChange} placeholder="Any special instructions…" rows={3} />
          </div>
          <div className="dash-form-actions">
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Schedule Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VisitSchedule() {
  const [visits, setVisits] = useState([])
  const [agents, setAgents] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', layout: '', agent: '' })
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(null) // visit id being updated

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [visitsRes, agentsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('visit_schedules')
            .select('id, visitor_name, visitor_phone, scheduled_at, status, notes, layout_id, agent_id, site_layouts(name), agents(name)')
            .order('scheduled_at', { ascending: false }),
          { label: 'Load visit schedules' }
        ),
        runSupabaseRequest(() => supabase.from('agents').select('id, name').eq('is_active', true).order('name'), { label: 'Load visit agents' }),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load visit layouts' }),
      ])
      setVisits(visitsRes.data)
      setAgents(agentsRes.data ?? [])
      setLayouts(layoutsRes.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(id, status) {
    setUpdating(id)
    try {
      await runSupabaseMutation(
        () => supabase.from('visit_schedules').update({ status }).eq('id', id),
        { label: 'Update visit status' }
      )
      setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  async function updateAgent(id, agent_id) {
    const agentObj = agents.find(a => a.id === agent_id) ?? null
    try {
      await runSupabaseMutation(
        () => supabase.from('visit_schedules').update({ agent_id: agent_id || null }).eq('id', id),
        { label: 'Update visit agent' }
      )
      setVisits(prev => prev.map(v => v.id === id
        ? { ...v, agent_id: agent_id || null, agents: agentObj }
        : v
      ))
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = visits.filter(v => {
    if (filters.status && v.status !== filters.status) return false
    if (filters.layout && v.layout_id !== filters.layout) return false
    if (filters.agent) {
      if (filters.agent === '__unassigned__') { if (v.agent_id) return false }
      else if (v.agent_id !== filters.agent) return false
    }
    return true
  })

  // Summary counts
  const counts = {}
  for (const s of VISIT_STATUSES) counts[s] = visits.filter(v => v.status === s).length

  if (loading) {
    return <div className="dash-page"><div className="dash-loading-inline">Loading visits…</div></div>
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Visit Schedule</h1>
        <span className="dash-page-count">{filtered.length} of {visits.length}</span>
        <button className="dash-btn dash-btn--primary" onClick={() => setShowModal(true)}>
          + Schedule Visit
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {/* Status summary strip */}
      <div className="dash-lead-summary">
        {VISIT_STATUSES.map(s => {
          const cfg = VISIT_STATUS_CONFIG[s]
          return (
            <button
              key={s}
              className={`dash-lead-summary-item${filters.status === s ? ' dash-lead-summary-item--active' : ''}`}
              style={filters.status === s ? { borderColor: cfg.color, color: cfg.color } : {}}
              onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s }))}
            >
              <span className="dash-lead-summary-count">{counts[s]}</span>
              <span className="dash-lead-summary-label">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="dash-filter-bar">
        <select
          className="dash-filter-select"
          value={filters.layout}
          onChange={e => setFilters(f => ({ ...f, layout: e.target.value }))}
        >
          <option value="">All Layouts</option>
          {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select
          className="dash-filter-select"
          value={filters.agent}
          onChange={e => setFilters(f => ({ ...f, agent: e.target.value }))}
        >
          <option value="">All Agents</option>
          <option value="__unassigned__">Unassigned</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {(filters.status || filters.layout || filters.agent) && (
          <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={() => setFilters({ status: '', layout: '', agent: '' })}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="dash-empty">No visits match the current filters.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Visitor</th>
                <th>Phone</th>
                <th>Layout</th>
                <th>Agent</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(visit => {
                const cfg = VISIT_STATUS_CONFIG[visit.status] ?? VISIT_STATUS_CONFIG.pending
                const actions = NEXT_ACTIONS[visit.status] ?? []
                const scheduledDate = new Date(visit.scheduled_at)
                return (
                  <tr key={visit.id} className="dash-table-row">
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#151717' }}>
                        {scheduledDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="dash-table-sub">
                        {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                    <td className="dash-table-name">{visit.visitor_name}</td>
                    <td>{visit.visitor_phone}</td>
                    <td>{visit.site_layouts?.name ?? '—'}</td>
                    <td>
                      <select
                        className="dash-filter-select dash-filter-select--inline"
                        value={visit.agent_id ?? ''}
                        onChange={e => updateAgent(visit.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <span
                        className="dash-badge"
                        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ maxWidth: '16rem' }}>
                      <span style={{ fontSize: '1.3rem', color: '#636366' }}>{visit.notes || '—'}</span>
                    </td>
                    <td>
                      <div className="dash-table-actions">
                        {actions.map(action => (
                          <button
                            key={action}
                            className={`dash-btn dash-btn--sm${action === 'cancelled' ? ' dash-btn--ghost' : ''}`}
                            onClick={() => updateStatus(visit.id, action)}
                            disabled={updating === visit.id}
                          >
                            {ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NewVisitModal
          layouts={layouts}
          agents={agents}
          onSave={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
