import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { runSupabaseRequest } from '../lib/supabaseRequest'

function formatCurrency(n) {
  if (!n && n !== 0) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function isOverdue(inst) {
  return inst.status === 'pending' && inst.due_date && new Date(inst.due_date) < new Date()
}

const STATUS_COLORS = {
  available:   { bg: '#f0fff4', color: '#1a7f3c', border: '#b7f5c4', label: 'Available' },
  booked:      { bg: '#f0f7ff', color: '#046ebc', border: '#cce3f8', label: 'Booked' },
  sold:        { bg: '#fff1f0', color: '#c0392b', border: '#ffc9c9', label: 'Sold' },
  negotiation: { bg: '#fff8e1', color: '#c77700', border: '#ffe08a', label: 'In Negotiation' },
  blocked:     { bg: '#f5f5f7', color: '#8e8e93', border: '#e5e5ea', label: 'Blocked' },
}

export default function BuyerPlotPage() {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [plot, setPlot] = useState(null)
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const { data: planData } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('id, plot_id, buyer_name, buyer_phone, total_amount, notes, payment_installments(id, installment_number, label, amount, due_date, paid_at, status, receipt_url)')
            .eq('buyer_user_id', user.id)
            .maybeSingle(),
          { label: 'Load buyer plot plan' }
        )

        if (cancelled || !planData) return

        setPlan(planData)
        const sorted = [...(planData.payment_installments ?? [])].sort(
          (a, b) => a.installment_number - b.installment_number
        )
        setInstallments(sorted)

        const { data: plotData } = await runSupabaseRequest(
          () => supabase
            .from('plots')
            .select('id, plot_number, dimensions, dimension_sqft, facing, status, road_width, corner_plot, price_per_sqft, amenities, site_layouts(name, address, cities(name, state))')
            .eq('id', planData.plot_id)
            .single(),
          { label: 'Load buyer plot details' }
        )

        if (cancelled) return
        setPlot(plotData)
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

  if (!plan || !plot) {
    return (
      <div className="buyer-page">
        <div className="buyer-page-header">
          <h1 className="buyer-page-title">My Plot</h1>
        </div>
        <div className="buyer-empty">
          <div className="buyer-empty-icon">📍</div>
          <p>No plot found. Contact VCR Builders to link your account.</p>
        </div>
      </div>
    )
  }

  const paidAmount = installments.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalInstAmt = installments.reduce((s, i) => s + Number(i.amount), 0)
  const pct = totalInstAmt > 0 ? (paidAmount / totalInstAmt) * 100 : 0
  const statusInfo = STATUS_COLORS[plot.status] ?? STATUS_COLORS.available
  const layout = plot.site_layouts ?? {}
  const city = layout.cities ?? {}

  return (
    <div className="buyer-page">
      <div className="buyer-page-header">
        <h1 className="buyer-page-title">My Plot</h1>
        <p className="buyer-page-subtitle">{layout.name}{city.name ? ` · ${city.name}` : ''}</p>
      </div>

      {/* Plot details */}
      <div className="buyer-card">
        <div className="buyer-card-header">
          <h2 className="buyer-card-title">Plot #{plot.plot_number}</h2>
          <span
            className="buyer-badge"
            style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border }}
          >
            {statusInfo.label}
          </span>
        </div>

        <div className="buyer-plot-grid">
          <div className="buyer-plot-field">
            <span className="buyer-plot-label">Dimensions</span>
            <span className="buyer-plot-value">{plot.dimensions}</span>
          </div>
          {plot.dimension_sqft && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">Area</span>
              <span className="buyer-plot-value">{Number(plot.dimension_sqft).toLocaleString('en-IN')} sqft</span>
            </div>
          )}
          <div className="buyer-plot-field">
            <span className="buyer-plot-label">Facing</span>
            <span className="buyer-plot-value">{plot.facing ?? '—'}</span>
          </div>
          {plot.road_width && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">Road Width</span>
              <span className="buyer-plot-value">{plot.road_width}</span>
            </div>
          )}
          {typeof plot.corner_plot === 'boolean' && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">Corner Plot</span>
              <span className="buyer-plot-value">{plot.corner_plot ? 'Yes' : 'No'}</span>
            </div>
          )}
          {plot.price_per_sqft && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">Price / sqft</span>
              <span className="buyer-plot-value">{formatCurrency(plot.price_per_sqft)}</span>
            </div>
          )}
          <div className="buyer-plot-field">
            <span className="buyer-plot-label">Layout</span>
            <span className="buyer-plot-value">{layout.name ?? '—'}</span>
          </div>
          {layout.address && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">Address</span>
              <span className="buyer-plot-value buyer-plot-value--muted">{layout.address}</span>
            </div>
          )}
          {city.name && (
            <div className="buyer-plot-field">
              <span className="buyer-plot-label">City</span>
              <span className="buyer-plot-value">{city.name}{city.state ? `, ${city.state}` : ''}</span>
            </div>
          )}
          {plot.amenities && plot.amenities.length > 0 && (
            <div className="buyer-plot-field" style={{ gridColumn: '1 / -1' }}>
              <span className="buyer-plot-label">Amenities</span>
              <span className="buyer-plot-value buyer-plot-value--muted">{plot.amenities.join(' · ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment plan */}
      <div className="buyer-card">
        <div className="buyer-card-header">
          <h2 className="buyer-card-title">Payment Plan</h2>
          <span className="buyer-card-meta">Buyer: {plan.buyer_name}</span>
        </div>

        <div className="buyer-progress-wrap">
          <div className="buyer-progress-info">
            <span>
              <strong>{installments.filter(i => i.status === 'paid').length}</strong> of{' '}
              <strong>{installments.length}</strong> installments paid
            </span>
            <span>
              <strong>{formatCurrency(paidAmount)}</strong> of <strong>{formatCurrency(totalInstAmt)}</strong>
            </span>
          </div>
          <div className="buyer-progress-bar">
            <div className="buyer-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {installments.length === 0 ? (
          <p style={{ color: '#8e8e93', fontSize: '1.4rem' }}>No installments scheduled yet.</p>
        ) : (
          <div className="buyer-table-wrap">
            <table className="buyer-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Paid On</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst, idx) => {
                  const overdue = isOverdue(inst)
                  return (
                    <tr key={inst.id}>
                      <td style={{ color: '#8e8e93', fontSize: '1.2rem' }}>{idx + 1}</td>
                      <td className="buyer-table-name">{inst.label}</td>
                      <td>{formatCurrency(inst.amount)}</td>
                      <td style={{ fontSize: '1.3rem', color: overdue ? '#c0392b' : '#636366' }}>
                        {inst.due_date
                          ? new Date(inst.due_date).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        {inst.status === 'paid' ? (
                          <span className="buyer-badge buyer-badge--paid">Paid</span>
                        ) : overdue ? (
                          <span className="buyer-badge buyer-badge--overdue">Overdue</span>
                        ) : (
                          <span className="buyer-badge buyer-badge--pending">Pending</span>
                        )}
                      </td>
                      <td style={{ fontSize: '1.3rem', color: '#636366' }}>
                        {inst.paid_at
                          ? new Date(inst.paid_at).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        {inst.receipt_url ? (
                          <a
                            href={inst.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#046ebc', fontSize: '1.3rem', fontWeight: 600 }}
                          >
                            View ↗
                          </a>
                        ) : (
                          <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {plan.notes && (
          <p style={{ marginTop: '1.6rem', fontSize: '1.4rem', color: '#636366', fontStyle: 'italic' }}>
            Note: {plan.notes}
          </p>
        )}
      </div>
    </div>
  )
}
