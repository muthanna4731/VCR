import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import LeadPipeline from './LeadPipeline'
import { runSupabaseRequest } from '../../lib/supabaseRequest'

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [buyers, setBuyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: plansData } = await runSupabaseRequest(
        () => supabase
          .from('payment_plans')
          .select('id, buyer_name, buyer_phone, plot_id, total_amount, plots(plot_number, site_layouts(name))'),
        { label: 'Load all buyers' }
      )

      setBuyers(
        (plansData ?? [])
          .filter(p => p.buyer_name)
          .map(p => ({
            id: p.id,
            buyerName: p.buyer_name,
            buyerPhone: p.buyer_phone,
            plotNumber: p.plots?.plot_number ?? null,
            layoutName: p.plots?.site_layouts?.name ?? null,
            plotId: p.plot_id,
            totalAmount: p.total_amount,
          }))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = buyers.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (b.buyerName?.toLowerCase().includes(q)) ||
           (b.buyerPhone?.toLowerCase().includes(q)) ||
           (b.layoutName?.toLowerCase().includes(q)) ||
           (b.plotNumber?.toLowerCase().includes(q))
  })

  if (loading) return <div className="dash-page"><div className="dash-loading-spinner"></div></div>

  return (
    <>
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Customers</h1>
        <span className="dash-page-count">{buyers.length} buyer{buyers.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-leads-search-wrap" style={{ marginBottom: '1.6rem' }}>
        <span className="material-symbols-outlined dash-leads-search-icon">search</span>
        <input
          className="dash-leads-search"
          type="text"
          placeholder="Search by name, phone, plot, or layout…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty">
          {buyers.length === 0
            ? 'No buyers yet. Add buyer information from the plot details page.'
            : 'No buyers match your search.'}
        </div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Plot</th>
                <th>Layout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="dash-table-row">
                  <td className="dash-table-name">{b.buyerName}</td>
                  <td style={{ fontSize: '1.4rem', color: '#636366' }}>
                    {b.buyerPhone ? (
                      <a href={`tel:${b.buyerPhone}`} style={{ color: '#636366' }}>{b.buyerPhone}</a>
                    ) : '—'}
                  </td>
                  <td>
                    {b.plotNumber ? (
                      <Link to={`/admin/plots/${b.plotId}`} className="dash-agent-tag">
                        #{b.plotNumber}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '1.4rem' }}>{b.layoutName ?? '—'}</td>
                  <td>
                    <div className="dash-table-actions">
                      {b.plotId && (
                        <Link to={`/admin/plots/${b.plotId}`} className="dash-btn dash-btn--sm dash-btn--ghost">
                          View Plot
                        </Link>
                      )}
                      <Link to="/admin/payments" className="dash-btn dash-btn--sm dash-btn--ghost">
                        Payments
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <LeadPipeline />
    </>
  )
}
