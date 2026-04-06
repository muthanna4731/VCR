import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseRequest } from '../../lib/supabaseRequest'

function GeofenceBadge({ within }) {
  if (within === true)  return <span className="dash-badge dash-badge--ok">Within site</span>
  if (within === false) return <span className="dash-badge dash-badge--overdue">Outside site</span>
  return <span className="dash-badge dash-badge--draft">No GPS</span>
}

export default function AgentPresenceLog() {
  const [logs, setLogs] = useState([])
  const [agents, setAgents] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ agent: '', layout: '', geofence: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logsRes, agentsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('agent_presence_logs')
            .select('id, logged_at, client_name, client_phone, latitude, longitude, is_within_geofence, distance_m, notes, agent_id, layout_id, agents(name), site_layouts(name)')
            .order('logged_at', { ascending: false })
            .limit(300),
          { label: 'Load presence logs' }
        ),
        runSupabaseRequest(() => supabase.from('agents').select('id, name').order('name'), { label: 'Load agents for presence log' }),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load layouts for presence log' }),
      ])
      setLogs(logsRes.data)
      setAgents(agentsRes.data ?? [])
      setLayouts(layoutsRes.data ?? [])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l => {
    if (filters.agent && l.agent_id !== filters.agent) return false
    if (filters.layout && l.layout_id !== filters.layout) return false
    if (filters.geofence === 'in'  && l.is_within_geofence !== true)  return false
    if (filters.geofence === 'out' && l.is_within_geofence !== false) return false
    if (filters.geofence === 'none' && l.is_within_geofence !== null) return false
    return true
  })

  function formatDate(ts) {
    const d = new Date(ts)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  if (loading) return <div className="dash-page"><div className="dash-loading-inline">Loading presence logs…</div></div>

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Presence Log</h1>
        <span className="dash-page-count">{filtered.length} of {logs.length} entries</span>
        <a
          href="/agent"
          target="_blank"
          rel="noopener noreferrer"
          className="dash-btn dash-btn--primary"
        >
          Open Agent Check-In ↗
        </a>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {/* Summary strip */}
      <div className="dash-presence-summary">
        <div className="dash-presence-summary-item">
          <span className="dash-presence-summary-value">{logs.length}</span>
          <span className="dash-presence-summary-label">Total Logs</span>
        </div>
        <div className="dash-presence-summary-item dash-presence-summary-item--ok">
          <span className="dash-presence-summary-value">{logs.filter(l => l.is_within_geofence === true).length}</span>
          <span className="dash-presence-summary-label">Within Site</span>
        </div>
        <div className="dash-presence-summary-item dash-presence-summary-item--warn">
          <span className="dash-presence-summary-value">{logs.filter(l => l.is_within_geofence === false).length}</span>
          <span className="dash-presence-summary-label">Outside Site</span>
        </div>
        <div className="dash-presence-summary-item">
          <span className="dash-presence-summary-value">{new Set(logs.map(l => l.agent_id)).size}</span>
          <span className="dash-presence-summary-label">Active Agents</span>
        </div>
      </div>

      {/* Filters */}
      <div className="dash-filter-bar">
        <select className="dash-filter-select" value={filters.agent}
          onChange={e => setFilters(f => ({ ...f, agent: e.target.value }))}>
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="dash-filter-select" value={filters.layout}
          onChange={e => setFilters(f => ({ ...f, layout: e.target.value }))}>
          <option value="">All Layouts</option>
          {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="dash-filter-select" value={filters.geofence}
          onChange={e => setFilters(f => ({ ...f, geofence: e.target.value }))}>
          <option value="">All Geofence</option>
          <option value="in">Within site</option>
          <option value="out">Outside site</option>
          <option value="none">No GPS</option>
        </select>
        {(filters.agent || filters.layout || filters.geofence) && (
          <button className="dash-btn dash-btn--ghost dash-btn--sm"
            onClick={() => setFilters({ agent: '', layout: '', geofence: '' })}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="dash-empty">No presence logs yet. Agents can log in at <a href="/agent" target="_blank" rel="noopener noreferrer" style={{ color: '#046ebc' }}>/agent</a>.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Agent</th>
                <th>Site</th>
                <th>Client</th>
                <th>Geofence</th>
                <th>Distance</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="dash-table-row">
                  <td style={{ whiteSpace: 'nowrap', fontSize: '1.3rem', color: '#636366' }}>
                    {formatDate(log.logged_at)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '1.3rem', color: '#636366' }}>
                    {formatTime(log.logged_at)}
                  </td>
                  <td className="dash-table-name">{log.agents?.name ?? '—'}</td>
                  <td>{log.site_layouts?.name ?? '—'}</td>
                  <td>
                    {log.client_name ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{log.client_name}</div>
                        {log.client_phone && <div className="dash-table-sub">{log.client_phone}</div>}
                      </>
                    ) : <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>—</span>}
                  </td>
                  <td><GeofenceBadge within={log.is_within_geofence} /></td>
                  <td style={{ fontSize: '1.3rem', color: '#636366', whiteSpace: 'nowrap' }}>
                    {log.distance_m !== null
                      ? log.distance_m < 1000
                        ? `${log.distance_m}m`
                        : `${(log.distance_m / 1000).toFixed(1)}km`
                      : '—'}
                  </td>
                  <td style={{ maxWidth: '18rem' }}>
                    <span style={{ fontSize: '1.3rem', color: '#636366' }}>{log.notes || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
