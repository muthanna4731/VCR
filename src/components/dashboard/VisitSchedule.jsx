import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const VISIT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

const CHANNEL_OPTIONS = [
  { value: 'website',    label: 'Website Form' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'referral',   label: 'Referral' },
  { value: 'phone',      label: 'Phone Call' },
  { value: 'agent',      label: 'Agent' },
  { value: 'social',     label: 'Social Media' },
  { value: 'other',      label: 'Other' },
]

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
  scheduled_at: '',
  notes: '',
}

const ADVANCED_STATUSES = ['visit_completed', 'converted', 'dropped']

function NewVisitModal({ layouts, agents, leads, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  // 'existing' = link to an existing lead, 'new' = create a new lead
  const [visitorMode, setVisitorMode] = useState('existing')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newChannel, setNewChannel] = useState('site_visit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const filteredLeads = leads.filter(l => {
    if (!leadSearch.trim()) return true
    const q = leadSearch.toLowerCase()
    return l.name?.toLowerCase().includes(q) || l.phone?.includes(q)
  })

  const selectedLead = leads.find(l => l.id === selectedLeadId) ?? null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.layout_id) { setError('Please select a layout.'); return }
    if (!form.scheduled_at) { setError('Please pick a date and time.'); return }

    if (visitorMode === 'existing') {
      if (!selectedLeadId) { setError('Please select an existing lead.'); return }
    } else {
      if (!newName.trim()) { setError('Visitor name is required.'); return }
      if (!newPhone.trim()) { setError('Visitor phone is required.'); return }
    }

    setSaving(true)
    setError(null)
    try {
      let leadId = null
      let visitorName = ''
      let visitorPhone = ''

      if (visitorMode === 'existing') {
        leadId = selectedLeadId
        visitorName = selectedLead.name
        visitorPhone = selectedLead.phone ?? ''
        if (!ADVANCED_STATUSES.includes(selectedLead.lead_status)) {
          await runSupabaseMutation(
            () => supabase.from('enquiries').update({ lead_status: 'visit_scheduled' }).eq('id', leadId),
            { label: 'Update lead status to visit_scheduled' }
          )
        }
      } else {
        visitorName = newName.trim()
        visitorPhone = newPhone.trim()
        const newLead = await runSupabaseMutation(
          () => supabase.from('enquiries').insert({
            name:        visitorName,
            phone:       visitorPhone,
            layout_id:   form.layout_id || null,
            lead_status: 'visit_scheduled',
            channel:     newChannel,
          }).select('id').single(),
          { label: 'Create lead from visit schedule' }
        )
        leadId = newLead.data?.id ?? null
      }

      await runSupabaseMutation(
        () => supabase.from('visit_schedules').insert({
          layout_id:     form.layout_id,
          agent_id:      form.agent_id || null,
          visitor_name:  visitorName,
          visitor_phone: visitorPhone,
          scheduled_at:  form.scheduled_at,
          notes:         form.notes.trim() || null,
          status:        'pending',
          enquiry_id:    leadId,
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

          {/* Visitor mode toggle */}
          <div className="dash-form-group">
            <label className="dash-form-label">Visitor</label>
            <div className="dash-segmented">
              <button
                type="button"
                className={`dash-segmented-btn${visitorMode === 'existing' ? ' dash-segmented-btn--active' : ''}`}
                onClick={() => setVisitorMode('existing')}
              >
                Existing Lead
              </button>
              <button
                type="button"
                className={`dash-segmented-btn${visitorMode === 'new' ? ' dash-segmented-btn--active' : ''}`}
                onClick={() => setVisitorMode('new')}
              >
                New Person
              </button>
            </div>
          </div>

          {visitorMode === 'existing' ? (
            <div className="dash-form-group">
              <label className="dash-form-label">Search Lead *</label>
              <input
                className="dash-form-input"
                placeholder="Search by name or phone…"
                value={leadSearch}
                onChange={e => { setLeadSearch(e.target.value); setSelectedLeadId('') }}
              />
              {leadSearch.trim() && (
                <div className="dash-lead-search-results">
                  {filteredLeads.length === 0 ? (
                    <div className="dash-lead-search-empty">No leads found</div>
                  ) : (
                    filteredLeads.slice(0, 8).map(l => (
                      <button
                        key={l.id}
                        type="button"
                        className={`dash-lead-search-item${selectedLeadId === l.id ? ' dash-lead-search-item--active' : ''}`}
                        onClick={() => { setSelectedLeadId(l.id); setLeadSearch(l.name) }}
                      >
                        <span className="dash-lead-search-name">{l.name}</span>
                        <span className="dash-lead-search-phone">{l.phone ?? '—'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedLead && (
                <div className="dash-lead-search-selected">
                  Linked: <strong>{selectedLead.name}</strong> · {selectedLead.phone ?? '—'} · <em>{selectedLead.lead_status?.replace(/_/g, ' ')}</em>
                </div>
              )}
            </div>
          ) : (
            <div className="dash-form-row">
              <div className="dash-form-group">
                <label className="dash-form-label">Name *</label>
                <input className="dash-form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Phone *</label>
                <input className="dash-form-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
          )}

          {visitorMode === 'new' && (
            <div className="dash-form-group">
              <label className="dash-form-label">Channel of Enquiry</label>
              <select className="dash-form-select" value={newChannel} onChange={e => setNewChannel(e.target.value)}>
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

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
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', layout: '', agent: '' })
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(null) // visit id being updated
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [editingVisit, setEditingVisit] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [visitsRes, agentsRes, layoutsRes, leadsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('visit_schedules')
            .select('id, visitor_name, visitor_phone, scheduled_at, status, notes, layout_id, agent_id, enquiry_id, site_layouts(name), agents(name), enquiries(id, name, lead_status)')
            .order('scheduled_at', { ascending: false }),
          { label: 'Load visit schedules' }
        ),
        runSupabaseRequest(() => supabase.from('agents').select('id, name').eq('is_active', true).order('name'), { label: 'Load visit agents' }),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load visit layouts' }),
        runSupabaseRequest(() => supabase.from('enquiries').select('id, name, phone, lead_status').order('name'), { label: 'Load leads for visit modal' }),
      ])
      setVisits(visitsRes.data)
      setAgents(agentsRes.data ?? [])
      setLayouts(layoutsRes.data ?? [])
      setLeads(leadsRes.data ?? [])
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

  function openEditVisit(visit) {
    setMenuOpenId(null)
    setEditForm({
      visitor_name: visit.visitor_name ?? '',
      visitor_phone: visit.visitor_phone ?? '',
      layout_id: visit.layout_id ?? '',
      agent_id: visit.agent_id ?? '',
      scheduled_at: visit.scheduled_at ? visit.scheduled_at.slice(0, 16) : '',
      notes: visit.notes ?? '',
      status: visit.status ?? 'pending',
    })
    setEditingVisit(visit)
  }

  async function saveEditVisit(e) {
    e.preventDefault()
    if (!editingVisit || !editForm) return
    setEditSaving(true)
    try {
      await runSupabaseMutation(
        () => supabase
          .from('visit_schedules')
          .update({
            visitor_name: editForm.visitor_name.trim(),
            visitor_phone: editForm.visitor_phone.trim(),
            layout_id: editForm.layout_id || null,
            agent_id: editForm.agent_id || null,
            scheduled_at: editForm.scheduled_at,
            notes: editForm.notes.trim() || null,
            status: editForm.status,
          })
          .eq('id', editingVisit.id),
        { label: 'Update visit schedule' }
      )
      await load()
      setEditingVisit(null)
      setEditForm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteVisit(id) {
    setDeleteConfirmId(null)
    setMenuOpenId(null)
    try {
      await runSupabaseMutation(
        () => supabase.from('visit_schedules').delete().eq('id', id),
        { label: 'Delete visit' }
      )
      setVisits(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      setError(err.message)
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
    return <div className="dash-page"><div className="dash-loading-spinner"></div></div>
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
                <th>Lead</th>
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
                      {visit.enquiries ? (
                        <span style={{ fontSize: '1.3rem' }}>
                          <div style={{ fontWeight: 500, color: '#151717' }}>{visit.enquiries.name}</div>
                          <div className="dash-table-sub">
                            {visit.enquiries.lead_status?.replace(/_/g, ' ')}
                          </div>
                        </span>
                      ) : (
                        <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>No lead</span>
                      )}
                    </td>
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
                        <div style={{ position: 'relative' }}>
                          <button
                            className="dash-btn dash-btn--sm dash-btn--ghost"
                            onClick={() => setMenuOpenId(menuOpenId === visit.id ? null : visit.id)}
                            aria-label="More actions"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '1.6rem', lineHeight: 1 }}
                          >
                            ⋮
                          </button>
                          {menuOpenId === visit.id && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => { setMenuOpenId(null); setDeleteConfirmId(null) }} />
                              <div style={{
                                position: 'absolute', right: 0, top: '100%', zIndex: 10,
                                background: '#fff', borderRadius: '0.6rem', boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                                border: '1px solid #e5e5ea', minWidth: '14rem', padding: '0.4rem 0', marginTop: '0.2rem',
                              }}>
                                <button
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.7rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#1c1c1e' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f2f2f7'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    onClick={() => openEditVisit(visit)}
                                  >
                                    Edit
                                  </button>
                                <div style={{ height: '1px', background: '#e5e5ea', margin: '0.2rem 0' }} />
                                {deleteConfirmId === visit.id ? (
                                  <div style={{ padding: '0.7rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '1.3rem', color: '#ff3b30', fontWeight: 600 }}>Delete?</span>
                                    <button className="dash-btn dash-btn--sm dash-btn--danger" onClick={() => deleteVisit(visit.id)}>Yes</button>
                                    <button className="dash-btn dash-btn--sm" onClick={() => setDeleteConfirmId(null)}>No</button>
                                  </div>
                                ) : (
                                  <button
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.7rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#ff3b30' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f2f2f7'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    onClick={() => setDeleteConfirmId(visit.id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
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
          leads={leads}
          onSave={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingVisit && editForm && (
        <div className="dash-modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && setEditingVisit(null)}>
          <div className="dash-modal">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">Edit Visit</h2>
              <button className="dash-modal-close" onClick={() => setEditingVisit(null)} aria-label="Close">✕</button>
            </div>
            <form className="dash-form" onSubmit={saveEditVisit}>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Visitor Name *</label>
                  <input className="dash-form-input" value={editForm.visitor_name}
                    onChange={e => setEditForm(f => ({ ...f, visitor_name: e.target.value }))} required />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Phone</label>
                  <input className="dash-form-input" value={editForm.visitor_phone}
                    onChange={e => setEditForm(f => ({ ...f, visitor_phone: e.target.value }))} />
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Layout</label>
                  <select className="dash-form-select" value={editForm.layout_id}
                    onChange={e => setEditForm(f => ({ ...f, layout_id: e.target.value }))}>
                    <option value="">Select layout…</option>
                    {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Agent</label>
                  <select className="dash-form-select" value={editForm.agent_id}
                    onChange={e => setEditForm(f => ({ ...f, agent_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Date & Time *</label>
                  <input className="dash-form-input" type="datetime-local" value={editForm.scheduled_at}
                    onChange={e => setEditForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Status</label>
                  <select className="dash-form-select" value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {VISIT_STATUSES.map(s => (
                      <option key={s} value={s}>{VISIT_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Notes</label>
                <textarea className="dash-form-textarea" value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
              <div className="dash-form-actions">
                <button type="button" className="dash-btn" onClick={() => setEditingVisit(null)}>Cancel</button>
                <button type="submit" className="dash-btn dash-btn--primary" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
