import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { runSupabaseRequest } from '../lib/supabaseRequest'

function formatCurrency(n) {
  if (!n && n !== 0) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

export default function BuyerOverviewPage() {
  const { user, profile } = useAuth()
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
          { label: 'Load buyer payment plan' }
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
          { label: 'Load buyer plot' }
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

  if (error) {
    return (
      <div className="buyer-page">
        <div className="buyer-error">{error}</div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="buyer-page">
        <div className="buyer-no-portal">
          <h2>No Plot Found</h2>
          <p>
            Your account hasn't been linked to a plot yet. Please contact VCR Builders
            to set up your buyer portal.
          </p>
          <a href="tel:+919876543210" className="buyer-contact-link">Contact VCR Builders</a>
        </div>
      </div>
    )
  }

  const paidInstallments = installments.filter(i => i.status === 'paid')
  const paidAmount = paidInstallments.reduce((s, i) => s + Number(i.amount), 0)
  const totalAmount = installments.reduce((s, i) => s + Number(i.amount), 0)
  const pct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
  const nextPending = installments.find(i => i.status === 'pending')
  const overdueCnt = installments.filter(
    i => i.status === 'pending' && i.due_date && new Date(i.due_date) < new Date()
  ).length

  return (
    <div className="buyer-page">
      <div className="buyer-welcome">
        <h1 className="buyer-welcome-title">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="buyer-welcome-sub">
          {plot ? `${plot.site_layouts?.name} · Plot #${plot.plot_number}` : 'Your VCR Buyer Portal'}
        </p>
      </div>

      <div className="buyer-stats">
        <div className="buyer-stat-card">
          <div className="buyer-stat-label">Plot</div>
          <div className="buyer-stat-value buyer-stat-value--blue">
            #{plot?.plot_number ?? '—'}
          </div>
          <div className="buyer-stat-sub">{plot?.dimensions ?? ''}</div>
        </div>

        <div className="buyer-stat-card">
          <div className="buyer-stat-label">Sale Amount</div>
          <div className="buyer-stat-value">{formatCurrency(plan.total_amount)}</div>
          <div className="buyer-stat-sub">{plot?.site_layouts?.name ?? ''}</div>
        </div>

        <div className="buyer-stat-card">
          <div className="buyer-stat-label">Amount Paid</div>
          <div className="buyer-stat-value buyer-stat-value--green">{formatCurrency(paidAmount)}</div>
          <div className="buyer-stat-sub">{pct}% of total</div>
        </div>

        <div className="buyer-stat-card">
          <div className="buyer-stat-label">Next Payment</div>
          {nextPending ? (
            <>
              <div className={`buyer-stat-value ${overdueCnt > 0 ? 'buyer-stat-value--orange' : ''}`}>
                {formatCurrency(nextPending.amount)}
              </div>
              <div className="buyer-stat-sub">
                {nextPending.label}
                {nextPending.due_date
                  ? ` · Due ${new Date(nextPending.due_date).toLocaleDateString('en-IN')}`
                  : ''}
                {overdueCnt > 0 ? ' (Overdue)' : ''}
              </div>
            </>
          ) : (
            <>
              <div className="buyer-stat-value buyer-stat-value--green">All clear</div>
              <div className="buyer-stat-sub">No pending payments</div>
            </>
          )}
        </div>
      </div>

      <div className="buyer-quick-links">
        <Link to="/my/plot" className="buyer-quick-link">
          <div className="buyer-quick-link-icon">📍</div>
          <div className="buyer-quick-link-text">
            <strong>My Plot &amp; Payments</strong>
            <span>{paidInstallments.length}/{installments.length} installments paid</span>
          </div>
        </Link>
        <Link to="/my/documents" className="buyer-quick-link">
          <div className="buyer-quick-link-icon">📁</div>
          <div className="buyer-quick-link-text">
            <strong>Documents</strong>
            <span>Sale agreements, receipts &amp; more</span>
          </div>
        </Link>
        <Link to="/my/visits" className="buyer-quick-link">
          <div className="buyer-quick-link-icon">📅</div>
          <div className="buyer-quick-link-text">
            <strong>Site Visits</strong>
            <span>Your scheduled visits</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
