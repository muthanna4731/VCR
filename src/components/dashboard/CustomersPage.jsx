import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import LeadPipeline from './LeadPipeline'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

// ─── New Customer Modal ───────────────────────────────────────────────────────
function NewCustomerModal({ layouts, onSave, onClose }) {
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_phone: '',
    plot_id: '',
    layout_id: '',
  })
  const [plots, setPlots] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Load plots when layout changes
  useEffect(() => {
    if (!form.layout_id) { setPlots([]); return }
    let active = true
    async function loadPlots() {
      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('plots')
            .select('id, plot_number, status')
            .eq('layout_id', form.layout_id)
            .order('plot_number'),
          { label: 'Load plots for customer modal' }
        )
        if (active) setPlots(data ?? [])
      } catch { /* ignore */ }
    }
    loadPlots()
    return () => { active = false }
  }, [form.layout_id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.buyer_name.trim()) { setError('Name is required.'); return }
    if (!form.plot_id) { setError('Please select a plot.'); return }

    setSaving(true)
    setError(null)

    try {
      // Check if payment_plan already exists for this plot
      const { data: existing } = await runSupabaseRequest(
        () => supabase
          .from('payment_plans')
          .select('id')
          .eq('plot_id', form.plot_id)
          .maybeSingle(),
        { label: 'Check existing payment plan' }
      )

      if (existing) {
        setError('A customer already exists for this plot.')
        setSaving(false)
        return
      }

      await runSupabaseMutation(
        () => supabase.from('payment_plans').insert({
          buyer_name: form.buyer_name.trim(),
          buyer_phone: form.buyer_phone.trim() || null,
          plot_id: form.plot_id,
          total_amount: 0,
        }),
        { label: 'Create new customer' }
      )
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">New Customer</h2>
          <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Name *</label>
              <input
                className="dash-form-input"
                value={form.buyer_name}
                onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
                placeholder="Customer name"
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Phone</label>
              <input
                className="dash-form-input"
                value={form.buyer_phone}
                onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Layout *</label>
              <select
                className="dash-form-select"
                value={form.layout_id}
                onChange={e => setForm(f => ({ ...f, layout_id: e.target.value, plot_id: '' }))}
              >
                <option value="">Select layout</option>
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Plot *</label>
              <select
                className="dash-form-select"
                value={form.plot_id}
                onChange={e => setForm(f => ({ ...f, plot_id: e.target.value }))}
                disabled={!form.layout_id}
              >
                <option value="">Select plot</option>
                {plots.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.plot_number} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dash-form-actions">
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [buyers, setBuyers] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [plansRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('id, buyer_name, buyer_phone, plot_id, total_amount, plots(plot_number, site_layouts(name))'),
          { label: 'Load all buyers' }
        ),
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, name').order('name'),
          { label: 'Load layouts for customer page' }
        ),
      ])

      setBuyers(
        (plansRes.data ?? [])
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
      setLayouts(layoutsRes.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteCustomer(id) {
    setDeleteConfirmId(null)
    setMenuOpenId(null)
    try {
      await runSupabaseMutation(
        () => supabase.from('payment_plans').delete().eq('id', id),
        { label: 'Delete customer' }
      )
      setBuyers(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

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
        <button
          className="dash-btn dash-btn--primary dash-btn--sm"
          onClick={() => setShowNewCustomer(true)}
          style={{ marginLeft: 'auto' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.6rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>add</span>
          New Customer
        </button>
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
            ? 'No buyers yet. Click "New Customer" to add one.'
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
                      <div className="dash-context-menu-wrap">
                        <button
                          className="dash-btn dash-btn--sm dash-btn--ghost dash-more-btn"
                          onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
                          aria-label="More actions"
                        >
                          ⋮
                        </button>
                        {menuOpenId === b.id && (
                          <>
                            <div className="dash-context-backdrop" onClick={() => { setMenuOpenId(null); setDeleteConfirmId(null) }} />
                            <div className="dash-context-menu">
                              {deleteConfirmId === b.id ? (
                                <div className="dash-context-confirm">
                                  <span className="dash-context-confirm-label">Delete?</span>
                                  <button className="dash-btn dash-btn--sm dash-btn--danger" onClick={() => deleteCustomer(b.id)}>Yes</button>
                                  <button className="dash-btn dash-btn--sm" onClick={() => setDeleteConfirmId(null)}>No</button>
                                </div>
                              ) : (
                                <button
                                  className="dash-context-btn--danger"
                                  onClick={() => setDeleteConfirmId(b.id)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <LeadPipeline />

    {/* New Customer Modal */}
    {showNewCustomer && (
      <NewCustomerModal
        layouts={layouts}
        onSave={() => { setShowNewCustomer(false); load() }}
        onClose={() => setShowNewCustomer(false)}
      />
    )}
    </>
  )
}
