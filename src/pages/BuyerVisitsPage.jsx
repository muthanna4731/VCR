import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { runSupabaseRequest } from '../lib/supabaseRequest'

const STATUS_INFO = {
  pending:   { label: 'Pending',   cls: 'buyer-badge--pending' },
  confirmed: { label: 'Confirmed', cls: 'buyer-badge--confirmed' },
  completed: { label: 'Completed', cls: 'buyer-badge--completed' },
  cancelled: { label: 'Cancelled', cls: 'buyer-badge--cancelled' },
}

export default function BuyerVisitsPage() {
  const { user } = useAuth()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('visit_schedules')
            .select('id, scheduled_at, status, notes, site_layouts(name, address)')
            .eq('buyer_user_id', user.id)
            .order('scheduled_at', { ascending: false }),
          { label: 'Load buyer visits' }
        )

        if (cancelled) return
        setVisits(data ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return (
      <div className="buyer-page">
        <div className="buyer-loading-inline"><div className="buyer-spinner" /> Loading…</div>
      </div>
    )
  }

  if (error) return <div className="buyer-page"><div className="buyer-error">{error}</div></div>

  return (
    <div className="buyer-page">
      <div className="buyer-page-header">
        <h1 className="buyer-page-title">Site Visits</h1>
        <p className="buyer-page-subtitle">Your scheduled and past site visits</p>
      </div>

      {visits.length === 0 ? (
        <div className="buyer-empty">
          <div className="buyer-empty-icon">📅</div>
          <p>No site visits on record yet.</p>
        </div>
      ) : (
        <div className="buyer-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="buyer-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="buyer-table">
              <thead>
                <tr>
                  <th>Layout</th>
                  <th>Date &amp; Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(visit => {
                  const statusInfo = STATUS_INFO[visit.status] ?? STATUS_INFO.pending
                  return (
                    <tr key={visit.id}>
                      <td>
                        <div className="buyer-table-name">{visit.site_layouts?.name ?? '—'}</div>
                        {visit.site_layouts?.address && (
                          <div className="buyer-table-sub">{visit.site_layouts.address}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '1.4rem' }}>
                          {new Date(visit.scheduled_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                        <div className="buyer-table-sub">
                          {new Date(visit.scheduled_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td>
                        <span className={`buyer-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                      </td>
                      <td style={{ fontSize: '1.3rem', color: '#636366', maxWidth: '24rem' }}>
                        {visit.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
