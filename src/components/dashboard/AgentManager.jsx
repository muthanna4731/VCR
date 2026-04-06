import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AgentPresenceLog from './AgentPresenceLog'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const EMPTY_FORM = { name: '', phone: '', email: '', is_active: true }

function AgentModal({ agent, layouts, assignedLayoutIds, onSave, onClose }) {
  const isEdit = Boolean(agent)
  const [form, setForm] = useState(isEdit ? {
    name: agent.name,
    phone: agent.phone ?? '',
    email: agent.email ?? '',
    is_active: agent.is_active,
  } : EMPTY_FORM)
  const [selectedLayouts, setSelectedLayouts] = useState(new Set(assignedLayoutIds))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function toggleLayout(id) {
    setSelectedLayouts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    let agentId = agent?.id
    if (isEdit) {
      try {
        await runSupabaseMutation(
          () => supabase
            .from('agents')
            .update({ name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, is_active: form.is_active })
            .eq('id', agentId),
          { label: 'Update agent' }
        )
      } catch (err) {
        setError(err.message); setSaving(false); return
      }
    } else {
      let data
      try {
        ({ data } = await runSupabaseMutation(
          () => supabase
            .from('agents')
            .insert({ name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, is_active: form.is_active })
            .select('id')
            .single(),
          { label: 'Create agent' }
        ))
      } catch (err) {
        setError(err.message); setSaving(false); return
      }
      agentId = data.id
    }

    // Sync layout assignments
    try {
      if (isEdit) {
        await runSupabaseMutation(
          () => supabase.from('agent_layout_assignments').delete().eq('agent_id', agentId),
          { label: 'Clear agent assignments' }
        )
      }
      if (selectedLayouts.size > 0) {
        const rows = [...selectedLayouts].map(lid => ({ agent_id: agentId, layout_id: lid }))
        await runSupabaseMutation(
          () => supabase.from('agent_layout_assignments').insert(rows),
          { label: 'Save agent assignments' }
        )
      }
    } catch (err) {
      setError(err.message); setSaving(false); return
    }

    onSave()
  }

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Agent' : 'New Agent'}>
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">{isEdit ? 'Edit Agent' : 'New Agent'}</h2>
          <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}
          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Name *</label>
              <input
                className="dash-form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Phone</label>
              <input
                className="dash-form-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Email</label>
            <input
              className="dash-form-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="agent@vcr.in"
            />
          </div>
          <label className="dash-form-check">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
            Active (can be assigned to leads and visits)
          </label>

          {isEdit && layouts.length > 0 && (
            <div className="dash-form-group">
              <label className="dash-form-label">Assigned Layouts</label>
              <div className="dash-agent-layout-checks">
                {layouts.map(l => (
                  <label key={l.id} className="dash-form-check">
                    <input
                      type="checkbox"
                      checked={selectedLayouts.has(l.id)}
                      onChange={() => toggleLayout(l.id)}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="dash-form-actions">
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AgentManager() {
  const [agents, setAgents] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // null | { agent, assignedLayoutIds } | 'new'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agentsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('agents')
            .select('id, name, phone, email, is_active, agent_layout_assignments(layout_id, site_layouts(name))')
            .order('name'),
          { label: 'Load agents' }
        ),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load layouts for agents' }),
      ])
      setAgents(agentsRes.data)
      setLayouts(layoutsRes.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])


  function openEdit(agent) {
    const assignedLayoutIds = agent.agent_layout_assignments.map(a => a.layout_id)
    setModal({ agent, assignedLayoutIds })
  }

  if (loading) {
    return <div className="dash-page"><div className="dash-loading-inline">Loading agents…</div></div>
  }

  return (
    <>
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Agents</h1>
        <span className="dash-page-count">{agents.length} total</span>
        <button className="dash-btn dash-btn--primary" onClick={() => setModal('new')}>
          + New Agent
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {agents.length === 0 ? (
        <p className="dash-empty">No agents yet. Add your first agent to start assigning leads.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Assigned Layouts</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const assignedLayouts = agent.agent_layout_assignments || []
                return (
                  <tr key={agent.id} className="dash-table-row">
                    <td className="dash-table-name">{agent.name}</td>
                    <td>{agent.phone ?? '—'}</td>
                    <td>{agent.email ?? '—'}</td>
                    <td>
                      {assignedLayouts.length === 0 ? (
                        <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>None</span>
                      ) : (
                        <div className="dash-agent-layout-tags">
                          {assignedLayouts.map(a => (
                            <span key={a.layout_id} className="dash-agent-tag">
                              {a.site_layouts?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`dash-badge ${agent.is_active ? 'dash-badge--ok' : 'dash-badge--draft'}`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="dash-table-actions">
                        <button className="dash-btn dash-btn--sm" onClick={() => openEdit(agent)}>
                          Edit
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

      {/* New / Edit modal */}
      {modal && (
        <AgentModal
          agent={modal === 'new' ? null : modal.agent}
          layouts={layouts}
          assignedLayoutIds={modal === 'new' ? [] : modal.assignedLayoutIds}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}


    </div>
    <AgentPresenceLog />
    </>
  )
}
