import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const LEAD_STATUSES = ['new', 'contacted', 'visit_scheduled', 'visit_completed', 'converted', 'dropped']

const CHANNEL_OPTIONS = [
  { value: 'website',    label: 'Website Form' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'referral',   label: 'Referral' },
  { value: 'phone',      label: 'Phone Call' },
  { value: 'agent',      label: 'Agent' },
  { value: 'social',     label: 'Social Media' },
  { value: 'other',      label: 'Other' },
]

const CHANNEL_COLORS = {
  website:    { color: '#046ebc', bg: '#f0f7ff', border: '#cce3f8' },
  site_visit: { color: '#5856d6', bg: '#f0f0ff', border: '#c7c7fa' },
  referral:   { color: '#34c759', bg: '#f0fff4', border: '#b7f5c4' },
  phone:      { color: '#c77700', bg: '#fff8e1', border: '#ffe08a' },
  agent:      { color: '#ff6b35', bg: '#fff4f0', border: '#ffd4c2' },
  social:     { color: '#af52de', bg: '#faf0ff', border: '#e8c7fa' },
  other:      { color: '#636366', bg: '#f5f5f7', border: '#e5e5ea' },
}

const LEAD_STATUS_CONFIG = {
  new:             { label: 'New',              color: '#636366', bg: '#f5f5f7', border: '#e5e5ea' },
  contacted:       { label: 'Contacted',        color: '#c77700', bg: '#fff8e1', border: '#ffe08a' },
  visit_scheduled: { label: 'Visit Scheduled',  color: '#046ebc', bg: '#f0f7ff', border: '#cce3f8' },
  visit_completed: { label: 'Visit Completed',  color: '#5856d6', bg: '#f0f0ff', border: '#c7c7fa' },
  converted:       { label: 'Converted',        color: '#34c759', bg: '#f0fff4', border: '#b7f5c4' },
  dropped:         { label: 'Dropped',          color: '#ff3b30', bg: '#fff1f0', border: '#ffccc7' },
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({ leadName, onConfirm, onCancel, deleting }) {
  return (
    <div className="dash-modal-overlay dash-confirm-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="dash-confirm-modal">
        <div className="dash-confirm-icon-wrap">
          <span className="material-symbols-outlined dash-confirm-icon">warning</span>
        </div>
        <h3 className="dash-confirm-title">Delete Lead</h3>
        <p className="dash-confirm-message">
          Are you sure you want to delete <strong>{leadName}</strong>? This action cannot be undone.
        </p>
        <div className="dash-confirm-actions">
          <button className="dash-btn" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="dash-btn dash-btn--danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lead Edit Modal ──────────────────────────────────────────────────────────
function LeadEditModal({ lead, isNew, layouts, agents, onSave, onClose }) {
  const [form, setForm] = useState({
    name:        lead.name ?? '',
    phone:       lead.phone ?? '',
    layout_id:   lead.layout_id ?? '',
    lead_status: lead.lead_status ?? 'new',
    agent_id:    lead.agent_id ?? '',
    notes:       lead.notes ?? '',
    channel:     lead.channel ?? 'other',
  })
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [notifyCopied, setNotifyCopied] = useState(false)

  const assignedAgent = agents.find(a => a.id === form.agent_id) ?? null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name:        form.name.trim(),
      phone:       form.phone.trim() || null,
      layout_id:   form.layout_id || null,
      lead_status: form.lead_status,
      agent_id:    form.agent_id || null,
      notes:       form.notes.trim() || null,
      channel:     form.channel || 'other',
    }

    let err = null
    try {
      if (isNew) {
        await runSupabaseMutation(() => supabase.from('enquiries').insert(payload), { label: 'Create lead' })
      } else {
        await runSupabaseMutation(() => supabase.from('enquiries').update(payload).eq('id', lead.id), { label: 'Update lead' })
      }
    } catch (error) {
      err = error
    }

    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  function copyNotification() {
    const agentName  = assignedAgent?.name ?? 'Agent'
    const statusLabel = LEAD_STATUS_CONFIG[form.lead_status]?.label ?? form.lead_status
    const layout = layouts.find(l => l.id === form.layout_id)?.name ?? lead.site_layouts?.name ?? '—'
    const msg = `Hi ${agentName},\n\nYou have been assigned a lead:\nName: ${form.name.trim()}\nPhone: ${form.phone.trim() || '—'}\nLayout: ${layout}\nStatus: ${statusLabel}\n${form.notes.trim() ? `Notes: ${form.notes.trim()}\n` : ''}\nPlease follow up at the earliest.`
    navigator.clipboard.writeText(msg)
    setNotifyCopied(true)
    setTimeout(() => setNotifyCopied(false), 2500)
  }

  const whatsappUrl = assignedAgent?.phone
    ? `https://wa.me/${assignedAgent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi ${assignedAgent.name}, you have a lead assigned to you:\n${form.name.trim()}${form.phone.trim() ? ` (${form.phone.trim()})` : ''}. Please follow up.`
      )}`
    : null

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">{isNew ? 'New Lead' : 'Edit Lead'}</h2>
          <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Name *</label>
              <input
                className="dash-form-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Lead name"
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Phone</label>
              <input
                className="dash-form-input"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="dash-form-group">
            <label className="dash-form-label">Status</label>
            <div className="dash-lead-status-grid">
              {LEAD_STATUSES.map(s => {
                const cfg    = LEAD_STATUS_CONFIG[s]
                const active = form.lead_status === s
                return (
                  <button
                    key={s}
                    type="button"
                    className="dash-lead-status-opt"
                    style={active
                      ? { color: cfg.color, background: cfg.bg, border: `1.5px solid ${cfg.color}` }
                      : { color: cfg.color, border: '1.5px solid transparent' }
                    }
                    onClick={() => setForm(f => ({ ...f, lead_status: s }))}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Channel of Enquiry</label>
              <select
                className="dash-form-select"
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Layout</label>
              <select
                className="dash-form-select"
                value={form.layout_id}
                onChange={e => setForm(f => ({ ...f, layout_id: e.target.value }))}
              >
                <option value="">No layout</option>
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="dash-form-group">
            <label className="dash-form-label">Assigned Agent</label>
            <select
              className="dash-form-select"
              value={form.agent_id}
              onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="dash-form-group">
            <label className="dash-form-label">Notes</label>
            <textarea
              className="dash-form-textarea"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Internal notes about this lead…"
            />
          </div>

          {/* Inform Agent */}
          {form.agent_id && assignedAgent && (
            <div className="dash-inform-agent">
              <div className="dash-inform-agent-info">
                <span className="material-symbols-outlined" style={{ fontSize: '1.8rem', color: '#636366' }}>person</span>
                <span style={{ fontWeight: 600, fontSize: '1.4rem' }}>{assignedAgent.name}</span>
                {assignedAgent.phone && (
                  <span style={{ color: '#636366', fontSize: '1.3rem' }}>{assignedAgent.phone}</span>
                )}
              </div>
              <div className="dash-inform-agent-actions">
                <button type="button" className="dash-btn dash-btn--sm" onClick={copyNotification}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', verticalAlign: 'middle', marginRight: '0.3rem' }}>
                    {notifyCopied ? 'check' : 'content_copy'}
                  </span>
                  {notifyCopied ? 'Copied!' : 'Copy Message'}
                </button>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dash-btn dash-btn--sm dash-btn--primary"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', verticalAlign: 'middle', marginRight: '0.3rem' }}>chat</span>
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="dash-form-actions">
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create Lead' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeadPipeline() {
  const [leads, setLeads]         = useState([])
  const [agents, setAgents]       = useState([])
  const [layouts, setLayouts]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [filters, setFilters]     = useState({ status: '', layout: '', agent: '' })
  const [editingLead, setEditingLead] = useState(null)
  const [creatingLead, setCreatingLead] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, agentsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('enquiries')
            .select('id, name, phone, channel, created_at, lead_status, notes, agent_id, layout_id, plot_id, site_layouts(id, name), plots(plot_number), agents(id, name)')
            .order('created_at', { ascending: false }),
          { label: 'Load leads' }
        ),
        runSupabaseRequest(() => supabase.from('agents').select('id, name, phone').eq('is_active', true).order('name'), { label: 'Load lead agents' }),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load lead layouts' }),
      ])
      setLeads(leadsRes.data)
      setAgents(agentsRes.data ?? [])
      setLayouts(layoutsRes.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDeleteLead() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await runSupabaseMutation(
        () => supabase.from('enquiries').delete().eq('id', deleteTarget.id),
        { label: 'Delete lead' }
      )
      setLeads(prev => prev.filter(l => l.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = leads.filter(l => {
    if (filters.status && l.lead_status !== filters.status) return false
    if (filters.layout && l.layout_id !== filters.layout) return false
    if (filters.agent) {
      if (filters.agent === '__unassigned__') { if (l.agent_id) return false }
      else if (l.agent_id !== filters.agent) return false
    }
    return true
  })

  const counts = {}
  for (const s of LEAD_STATUSES) counts[s] = leads.filter(l => l.lead_status === s).length

  if (loading) {
    return <div className="dash-page"><div className="dash-loading-spinner"></div></div>
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <h1 className="dash-page-title">Leads</h1>
          <span className="dash-page-count">{filtered.length} of {leads.length}</span>
        </div>
        <button className="dash-btn dash-btn--primary dash-btn--sm" onClick={() => setCreatingLead(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>add</span>
          New Lead
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {/* Status summary strip */}
      <div className="dash-lead-summary">
        {LEAD_STATUSES.map(s => {
          const cfg = LEAD_STATUS_CONFIG[s]
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
        <p className="dash-empty">No leads match the current filters.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Channel</th>
                <th>Layout / Plot</th>
                <th>Status</th>
                <th>Agent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const cfg = LEAD_STATUS_CONFIG[lead.lead_status ?? 'new']
                return (
                  <tr key={lead.id} className="dash-table-row">
                    <td style={{ whiteSpace: 'nowrap', color: '#636366', fontSize: '1.3rem' }}>
                      {new Date(lead.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="dash-table-name">{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>
                      {(() => {
                        const ch = lead.channel || 'other'
                        const cfg = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.other
                        const lbl = CHANNEL_OPTIONS.find(o => o.value === ch)?.label ?? ch
                        return (
                          <span
                            className="dash-badge"
                            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                          >
                            {lbl}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      <div>{lead.site_layouts?.name ?? '—'}</div>
                      {lead.plots?.plot_number && (
                        <div className="dash-table-sub">Plot #{lead.plots.plot_number}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className="dash-lead-status-badge"
                        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, cursor: 'default' }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: '#636366', fontSize: '1.3rem' }}>
                      {lead.agents?.name ?? <span style={{ color: '#aeaeb2' }}>Unassigned</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          className="dash-btn dash-btn--sm dash-btn--ghost"
                          onClick={() => setEditingLead(lead)}
                          title="Edit lead"
                          aria-label={`Edit lead ${lead.name}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', verticalAlign: 'middle' }}>edit</span>
                        </button>
                        <button
                          className="dash-btn dash-btn--sm dash-btn--ghost"
                          onClick={() => setDeleteTarget(lead)}
                          title="Delete lead"
                          aria-label={`Delete lead ${lead.name}`}
                          style={{ color: '#ff3b30' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', verticalAlign: 'middle' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          layouts={layouts}
          agents={agents}
          onSave={() => { setEditingLead(null); load() }}
          onClose={() => setEditingLead(null)}
        />
      )}

      {creatingLead && (
        <LeadEditModal
          lead={{ name: '', phone: '', layout_id: '', lead_status: 'new', agent_id: '', notes: '', channel: 'other' }}
          isNew
          layouts={layouts}
          agents={agents}
          onSave={() => { setCreatingLead(false); load() }}
          onClose={() => setCreatingLead(false)}
        />
      )}

      {/* Styled Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          leadName={deleteTarget.name}
          onConfirm={handleDeleteLead}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
