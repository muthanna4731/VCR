import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { runSupabaseRequest, runSupabaseMutation } from '../lib/supabaseRequest'

const CHANNEL_OPTIONS = [
  { value: 'website',    label: 'Website' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'referral',   label: 'Referral' },
  { value: 'phone',      label: 'Phone' },
  { value: 'agent',      label: 'Agent' },
  { value: 'social',     label: 'Social' },
  { value: 'other',      label: 'Other' },
]

const CHANNEL_COLORS = {
  website:    { color: '#046ebc', bg: '#f0f7ff' },
  site_visit: { color: '#5856d6', bg: '#f0f0ff' },
  referral:   { color: '#34c759', bg: '#f0fff4' },
  phone:      { color: '#c77700', bg: '#fff8e1' },
  agent:      { color: '#ff6b35', bg: '#fff4f0' },
  social:     { color: '#af52de', bg: '#faf0ff' },
  other:      { color: '#636366', bg: '#f5f5f7' },
}

function formatCurrency(n) {
  if (!n && n !== 0) return '₹0'
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + ' Cr'
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + ' L'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getLeadStage(status) {
  const map = {
    new:        { label: 'New Lead',      cls: 'dash-stage-badge--new' },
    visit:      { label: 'Site Visit',    cls: 'dash-stage-badge--visit' },
    negotiation:{ label: 'In Negotiation',cls: 'dash-stage-badge--nego' },
    kyc:        { label: 'KYC',           cls: 'dash-stage-badge--kyc' },
    converted:  { label: 'Converted',     cls: 'dash-stage-badge--conv' },
  }
  return map[status] ?? { label: status ?? 'New Lead', cls: 'dash-stage-badge--new' }
}

function getPriority(index) {
  if (index === 0) return { label: 'High', cls: 'dash-inquiry-priority--high' }
  if (index === 1) return { label: 'Med',  cls: 'dash-inquiry-priority--med' }
  return { label: 'Low', cls: 'dash-inquiry-priority--low' }
}

function computeRevenueChart(installments, range, customFrom, customTo) {
  const today = new Date()
  const months = []

  if (range === 'custom' && customFrom && customTo) {
    let d = new Date(customFrom + '-01')
    const end = new Date(customTo + '-01')
    while (d <= end) {
      months.push(new Date(d))
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
  } else {
    const n = parseInt(range) || 6
    for (let i = n - 1; i >= 0; i--) {
      months.push(new Date(today.getFullYear(), today.getMonth() - i, 1))
    }
  }

  const monthKeys   = months.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  const monthLabels = months.map(d => d.toLocaleString('en-IN', { month: 'short' }).toUpperCase())
  const revenue     = Object.fromEntries(monthKeys.map(k => [k, 0]))

  for (const inst of installments) {
    if (inst.status === 'paid' && inst.created_at) {
      const d   = new Date(inst.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in revenue) revenue[key] += Number(inst.amount) || 0
    }
  }

  const monthValues = monthKeys.map(k => revenue[k])
  const chartMax    = Math.max(...monthValues, 1)
  return { monthLabels, monthValues, chartMax }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminOverviewPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]       = useState('')
  const [revenueRange, setRevenueRange] = useState('6')
  const [customFrom, setCustomFrom]     = useState('')
  const [customTo, setCustomTo]         = useState('')
  const [openActionId, setOpenActionId] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [deletingLeadId, setDeletingLeadId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [layoutsRes, plotsRes, enquiriesRes, enquiryCountRes, plansRes] = await Promise.all([
          runSupabaseRequest(
            () => supabase.from('site_layouts').select('id, name, is_published, layout_image_url, slug, cities(name)'),
            { label: 'Load admin layouts overview' }
          ),
          runSupabaseRequest(
            () => supabase.from('plots').select('id, status, price_per_sqft'),
            { label: 'Load admin plots overview' }
          ),
          runSupabaseRequest(
            () => supabase
              .from('enquiries')
              .select('id, name, phone, lead_status, channel, created_at, site_layouts(name)')
              .order('created_at', { ascending: false })
              .limit(10),
            { label: 'Load recent enquiries' }
          ),
          runSupabaseRequest(
            () => supabase.from('enquiries').select('id', { count: 'exact', head: true }),
            { label: 'Count enquiries' }
          ),
          runSupabaseRequest(
            () => supabase.from('payment_installments').select('status, due_date, amount, created_at'),
            { label: 'Load installment overview' }
          ),
        ])

        if (cancelled) return

        const layouts      = layoutsRes.data ?? []
        const plots        = plotsRes.data ?? []
        const enquiries      = enquiriesRes.data ?? []
        const enquiryTotal   = enquiryCountRes.count ?? 0
        const installments   = plansRes.data ?? []

        // Plot status counts
        const statusCounts = { available: 0, negotiation: 0, booked: 0, sold: 0, blocked: 0 }
        for (const p of plots) {
          if (p.status in statusCounts) statusCounts[p.status]++
        }
        const total     = plots.length || 1
        const soldPct   = Math.round((statusCounts.sold / total) * 100)
        const bookedPct = Math.round((statusCounts.booked / total) * 100)
        const availPct  = 100 - soldPct - bookedPct

        // Donut arc values (out of 100 circumference ≈ 100.53 for r=16)
        const C = 100.53
        const soldArc   = Math.round((statusCounts.sold / total) * C)
        const bookedArc = Math.round((statusCounts.booked / total) * C)
        const availArc  = C - soldArc - bookedArc

        // Revenue
        let revenueCollected = 0
        let revenuePending   = 0
        for (const inst of installments) {
          const amt = Number(inst.amount) || 0
          if (inst.status === 'paid') revenueCollected += amt
          else revenuePending += amt
        }

        setData({
          layouts,
          enquiries,
          enquiryTotal,
          statusCounts,
          total: plots.length,
          soldPct, bookedPct, availPct,
          soldArc, bookedArc, availArc,
          revenueCollected, revenuePending,
          allInstallments: installments,
        })
        setLastSync(new Date())
      } catch (error) {
        if (cancelled) return
        setError(error.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="dash-page"><div className="dash-loading-inline">Loading…</div></div>
  if (error)   return <div className="dash-page"><p className="dash-error">{error}</p></div>

  const {
    layouts, enquiries, enquiryTotal, statusCounts, total,
    soldPct, bookedPct, availPct,
    soldArc, bookedArc, availArc,
    revenueCollected, revenuePending,
    allInstallments,
  } = data

  const { monthLabels, monthValues, chartMax } =
    computeRevenueChart(allInstallments, revenueRange, customFrom, customTo)

  const totalPortfolio = revenueCollected + revenuePending
  const inventorySoldPct = total > 0 ? Math.round((statusCounts.sold / total) * 100) : 0

  const filtered = search.trim()
    ? enquiries.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.site_layouts?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : enquiries

  function exportLeadsCSV() {
    const rows = [['Name', 'Phone', 'Layout', 'Status', 'Date']]
    for (const e of filtered) {
      rows.push([
        e.name ?? '',
        e.phone ?? '',
        e.site_layouts?.name ?? '',
        e.lead_status ?? '',
        e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : '',
      ])
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteLead(id) {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return
    setDeletingLeadId(id)
    setOpenActionId(null)
    try {
      await runSupabaseMutation(
        () => supabase.from('enquiries').delete().eq('id', id),
        { label: 'Delete lead from overview' }
      )
      setData(prev => ({ ...prev, enquiries: prev.enquiries.filter(e => e.id !== id) }))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingLeadId(null)
    }
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 17) return 'Afternoon'
    return 'Evening'
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin'

  return (
    <div className="dash-page">

      {/* ── Hero stats row ── */}
      <div className="dash-hero-stats">
        {/* Portfolio Value */}
        <div className="dash-glass dash-hero-card">
          <div className="dash-hero-card-head">
            <span className="dash-hero-label">Portfolio Value</span>
            <span className="material-symbols-outlined dash-hero-icon">account_balance_wallet</span>
          </div>
          <div className="dash-hero-value">{formatCurrency(totalPortfolio)}</div>
          <div className="dash-hero-trend">
            <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>trending_up</span>
            {formatCurrency(revenueCollected)} collected
          </div>
        </div>

        {/* Inventory Sold */}
        <div className="dash-glass dash-hero-card">
          <div className="dash-hero-card-head">
            <span className="dash-hero-label">Inventory Sold</span>
            <span className="material-symbols-outlined dash-hero-icon">sell</span>
          </div>
          <div className="dash-hero-value">{inventorySoldPct}%</div>
          <div className="dash-progress-track">
            <div className="dash-progress-fill" style={{ width: `${inventorySoldPct}%` }} />
          </div>
        </div>

        {/* Active Enquiries */}
        <div className="dash-glass dash-hero-card">
          <div className="dash-hero-card-head">
            <span className="dash-hero-label">Active Enquiries</span>
            <span className="material-symbols-outlined dash-hero-icon">groups</span>
          </div>
          <div className="dash-hero-value">{enquiryTotal}</div>
          <div className="dash-hero-trend">
            <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>bolt</span>
            {statusCounts.negotiation} in negotiation
          </div>
        </div>

        {/* Pending Closures */}
        <div className="dash-glass dash-hero-card">
          <div className="dash-hero-card-head">
            <span className="dash-hero-label">Pending Closures</span>
            <span className="material-symbols-outlined dash-hero-icon">handshake</span>
          </div>
          <div className="dash-hero-value">{statusCounts.booked}</div>
          <div className="dash-hero-trend dash-hero-trend--muted">
            Est. {formatCurrency(revenuePending)}
          </div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="dash-charts-grid">
        {/* Revenue History bar chart */}
        <div className="dash-glass dash-barchart">
          <div className="dash-barchart-head">
            <h2 className="dash-barchart-title">Revenue History</h2>
            <select
              className="dash-filter-select"
              value={revenueRange}
              onChange={e => { setRevenueRange(e.target.value); setCustomFrom(''); setCustomTo('') }}
              style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}
            >
              <option value="1">Last Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {revenueRange === 'custom' && (
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.6rem', flexWrap: 'wrap' }}>
              <input
                type="month"
                className="dash-filter-select"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}
              />
              <span style={{ fontSize: '1.2rem', color: '#636366' }}>to</span>
              <input
                type="month"
                className="dash-filter-select"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}
              />
            </div>
          )}

          <div className="dash-barchart-bars">
            {monthLabels.map((month, i) => {
              const revH = Math.round((monthValues[i] / chartMax) * 100)
              return (
                <div key={month + i} className="dash-barchart-group" title={`${month}: ${formatCurrency(monthValues[i])}`}>
                  <div className="dash-barchart-pair">
                    <div
                      className="dash-barchart-bar dash-barchart-bar--revenue"
                      style={{ height: `${Math.max(revH, 2)}%`, width: '70%', margin: '0 auto' }}
                    />
                  </div>
                  <span className="dash-barchart-month">{month}</span>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'right', fontSize: '1.2rem', color: '#8e8e93', marginTop: '0.8rem' }}>
            Total: {formatCurrency(monthValues.reduce((a, b) => a + b, 0))}
          </div>
        </div>

        {/* Inventory Status donut */}
        <div className="dash-glass dash-donut">
          <h2 className="dash-donut-title">Inventory Status</h2>
          <div className="dash-donut-wrap">
            <svg className="dash-donut-svg" viewBox="0 0 36 36">
              <circle cx="18" cy="18" fill="none" r="16" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
              <circle
                cx="18" cy="18" fill="none" r="16"
                stroke="#0066cc"
                strokeWidth="4"
                strokeDasharray={`${soldArc} ${100}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              <circle
                cx="18" cy="18" fill="none" r="16"
                stroke="#ffb786"
                strokeWidth="4"
                strokeDasharray={`${bookedArc} ${100}`}
                strokeDashoffset={`-${soldArc}`}
                strokeLinecap="round"
              />
              <circle
                cx="18" cy="18" fill="none" r="16"
                stroke="#1d1d1f"
                strokeWidth="4"
                strokeDasharray={`${Math.max(availArc, 0)} ${100}`}
                strokeDashoffset={`-${soldArc + bookedArc}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="dash-donut-center">
              <span className="dash-donut-center-value">{total}</span>
              <span className="dash-donut-center-label">Total</span>
            </div>
          </div>
          <div className="dash-donut-legend">
            <div className="dash-donut-legend-item">
              <div className="dash-donut-legend-left">
                <span className="dash-donut-legend-dot" style={{ background: '#0066cc' }} />
                Sold Units
              </div>
              <span className="dash-donut-legend-val">{soldPct}%</span>
            </div>
            <div className="dash-donut-legend-item">
              <div className="dash-donut-legend-left">
                <span className="dash-donut-legend-dot" style={{ background: '#ffb786' }} />
                Booked
              </div>
              <span className="dash-donut-legend-val">{bookedPct}%</span>
            </div>
            <div className="dash-donut-legend-item">
              <div className="dash-donut-legend-left">
                <span className="dash-donut-legend-dot" style={{ background: '#1d1d1f' }} />
                Available
              </div>
              <span className="dash-donut-legend-val">{availPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Projects ── */}
      <div className="dash-projects-section">
        <div className="dash-projects-header">
          <h2 className="dash-projects-title">Active Projects</h2>
          <Link to="/admin/layouts" className="dash-projects-link">
            Explore All
            <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>arrow_forward</span>
          </Link>
        </div>
        <div className="dash-projects-grid">
          {layouts.slice(0, 4).map((layout, i) => {
            const badge = i === 0
              ? { label: 'Active', cls: 'dash-project-status-badge--active' }
              : i === layouts.length - 1 && !layout.is_published
              ? { label: 'Pending', cls: 'dash-project-status-badge--pending' }
              : layout.is_published
              ? { label: 'Published', cls: 'dash-project-status-badge--active' }
              : { label: 'New', cls: 'dash-project-status-badge--new' }
            return (
              <Link key={layout.id} to={`/admin/plots?layout=${layout.id}`} className="dash-glass dash-project-card" style={{ textDecoration: 'none' }}>
                <div className="dash-project-img-wrap">
                  {layout.layout_image_url
                    ? <img src={layout.layout_image_url} alt={layout.name} className="dash-project-img" />
                    : (
                      <div className="dash-project-img-placeholder">
                        <span className="material-symbols-outlined" style={{ fontSize: '4rem' }}>location_city</span>
                      </div>
                    )
                  }
                </div>
                <div className="dash-project-body">
                  <div className="dash-project-name-row">
                    <span className="dash-project-name">{layout.name}</span>
                    <span className={`dash-project-status-badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <p className="dash-project-meta">
                    {layout.cities?.name ?? 'Karnataka'}
                  </p>
                  <div className="dash-project-footer">
                    <span className="dash-project-price">{layout.cities?.name ?? '—'}</span>
                    <span className="dash-project-avail">View Layout →</span>
                  </div>
                </div>
              </Link>
            )
          })}
          {/* Fill empty slots if fewer than 4 layouts */}
          {layouts.length === 0 && (
            <p className="dash-empty" style={{ gridColumn: '1/-1' }}>No layouts yet.</p>
          )}
        </div>
      </div>

      {/* ── Desktop: Lead Activity table ── */}
      <div className="dash-glass dash-leads-card dash-desktop-only">
        <div className="dash-leads-header">
          <div className="dash-leads-header-left">
            <h2 className="dash-leads-title">Lead Activity</h2>
            <div className="dash-leads-live-badge">
              <span className="dash-leads-live-dot" />
              <span className="dash-leads-live-text">Live Tracker</span>
            </div>
          </div>
          <div className="dash-leads-controls">
            <div className="dash-leads-search-wrap">
              <span className="material-symbols-outlined dash-leads-search-icon">search</span>
              <input
                className="dash-leads-search"
                type="text"
                placeholder="Filter leads by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="dash-leads-export-btn" onClick={exportLeadsCSV}>
              <span className="material-symbols-outlined">ios_share</span>
              Export
            </button>
          </div>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Lead Information</th>
                <th>Inquiry Target</th>
                <th>Channel</th>
                <th>Stage</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="dash-empty" style={{ padding: '3.2rem', textAlign: 'center' }}>No enquiries yet.</td></tr>
              ) : filtered.map(e => {
                const stage = getLeadStage(e.lead_status)
                return (
                  <tr key={e.id} className="dash-table-row">
                    <td>
                      <div className="dash-table-name">{e.name}</div>
                      {e.phone && <div style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.4)', marginTop: '0.2rem' }}>{e.phone}</div>}
                    </td>
                    <td style={{ color: 'rgba(0,0,0,0.7)', fontWeight: 500 }}>
                      {e.site_layouts?.name ?? '—'}
                    </td>
                    <td>
                      {(() => {
                        const ch = e.channel || 'other'
                        const cfg = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.other
                        const label = CHANNEL_OPTIONS.find(o => o.value === ch)?.label ?? ch
                        return (
                          <span className="dash-channel-badge" style={{ color: cfg.color, background: cfg.bg }}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      <span className={`dash-stage-badge ${stage.cls}`}>{stage.label}</span>
                    </td>
                    <td style={{ color: 'rgba(0,0,0,0.4)', fontSize: '1.2rem' }}>
                      {new Date(e.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', position: 'relative' }}>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)' }}
                        onClick={() => setOpenActionId(openActionId === e.id ? null : e.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>more_horiz</span>
                      </button>
                      {openActionId === e.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 10,
                          background: '#fff', borderRadius: '0.8rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          minWidth: '16rem', padding: '0.4rem 0', border: '1px solid #e5e5ea',
                        }}>
                          <button
                            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%', padding: '0.8rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#1d1d1f' }}
                            onClick={() => { navigate('/admin/customers'); setOpenActionId(null) }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>visibility</span>
                            View Lead
                          </button>
                          {e.phone && (
                            <button
                              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%', padding: '0.8rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#1d1d1f' }}
                              onClick={() => { navigator.clipboard.writeText(e.phone); setOpenActionId(null) }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>content_copy</span>
                              Copy Phone
                            </button>
                          )}
                          {e.phone && (
                            <a
                              href={`https://wa.me/91${e.phone.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%', padding: '0.8rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#1d1d1f', textDecoration: 'none' }}
                              onClick={() => setOpenActionId(null)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>chat</span>
                              WhatsApp
                            </a>
                          )}
                          <div style={{ height: '1px', background: '#f0f0f0', margin: '0.4rem 0' }} />
                          <button
                            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%', padding: '0.8rem 1.2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#ff3b30' }}
                            onClick={() => deleteLead(e.id)}
                            disabled={deletingLeadId === e.id}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.6rem' }}>delete</span>
                            {deletingLeadId === e.id ? 'Deleting…' : 'Delete Lead'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile: Inquiry cards ── */}
      <div className="dash-mobile-only">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.6rem' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-headline)', color: 'var(--dash-text)', margin: 0 }}>Recent Enquiries</h3>
          <Link to="/admin/customers" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--dash-primary)', textDecoration: 'none' }}>View All</Link>
        </div>
        <div className="dash-inquiry-cards">
          {enquiries.slice(0, 5).map((e, i) => {
            const prio = getPriority(i)
            const initials = getInitials(e.name)
            return (
              <div key={e.id} className="dash-glass dash-inquiry-card">
                <div className="dash-inquiry-card-left">
                  <div className="dash-inquiry-avatar" style={{ color: i % 3 === 0 ? '#a95400' : i % 3 === 1 ? '#0066cc' : '#2f4866' }}>
                    {initials}
                  </div>
                  <div>
                    <p className="dash-inquiry-name">{e.name}</p>
                    <p className="dash-inquiry-sub">{e.site_layouts?.name ?? 'General Enquiry'}</p>
                  </div>
                </div>
                <div className="dash-inquiry-card-right">
                  <span className={`dash-inquiry-priority ${prio.cls}`}>{prio.label}</span>
                  <span className="dash-inquiry-time">{timeAgo(e.created_at)}</span>
                </div>
              </div>
            )
          })}
          {enquiries.length === 0 && <p className="dash-empty">No enquiries yet.</p>}
        </div>
      </div>

      {/* ── Footer (desktop only) ── */}
      <div className="dash-footer-bar dash-desktop-only">
        <div>RealEstateOS V:01 • Last sync: {lastSync ? lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
        <div className="dash-footer-links">
          <Link to="/admin/payments">Finance Overview</Link>
          <Link to="/admin/agents">Agent Performance</Link>
          <Link to="/admin/customers">All Customers</Link>
        </div>
      </div>
    </div>
  )
}
