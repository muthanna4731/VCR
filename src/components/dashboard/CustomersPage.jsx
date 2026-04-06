import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import LeadPipeline from './LeadPipeline'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

// ─── Create Buyer Modal ───────────────────────────────────────────────────────
function CreateBuyerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.')
      return
    }
    setSaving(true)
    setError(null)

    // Create Supabase auth user via admin API (requires service role key on server)
    // Since this is a client-side app, we use signUp — owner can invite via dashboard too.
    // We use Supabase Admin signUp flow:
    let signUpData
    try {
      ({ data: signUpData } = await runSupabaseMutation(
        () => supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password.trim(),
          options: {
            data: { full_name: form.full_name.trim(), role: 'buyer' },
          },
        }),
        { label: 'Create buyer auth account' }
      ))
    } catch (signUpErr) {
      setError(signUpErr.message); setSaving(false); return
    }

    const userId = signUpData.user?.id
    if (!userId) { setError('Account created but user ID missing.'); setSaving(false); return }

    // Set role to 'buyer' and fill profile
    try {
      await runSupabaseMutation(
        () => supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: form.full_name.trim() || null,
            phone: form.phone.trim() || null,
            role: 'buyer',
          }, { onConflict: 'id' }),
        { label: 'Create buyer profile' }
      )
    } catch (profileErr) {
      setError(profileErr.message); setSaving(false); return
    }

    setSuccess(true)
    setSaving(false)
    onCreated?.()
  }

  if (success) {
    return (
      <div className="dash-modal-overlay">
        <div className="dash-modal dash-modal--sm">
          <div className="dash-modal-header">
            <h2 className="dash-modal-title">Buyer Account Created</h2>
            <button className="dash-modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="dash-form">
            <div className="dash-success">
              Account created for {form.full_name || form.email}. They can now log in at /login and access their portal at /my.
            </div>
            <div className="dash-form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
              <button className="dash-btn dash-btn--primary" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal dash-modal--sm">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">Create Buyer Account</h2>
          <button className="dash-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}
          <div className="dash-form-group">
            <label className="dash-form-label">Full Name</label>
            <input className="dash-form-input" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Buyer's full name" />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Phone</label>
            <input className="dash-form-input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210" />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Email *</label>
            <input className="dash-form-input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required placeholder="buyer@email.com" />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">Temporary Password *</label>
            <input className="dash-form-input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required placeholder="Min. 6 characters" minLength={6} />
            <span className="dash-form-hint">Buyer should change this after first login.</span>
          </div>
          <div className="dash-form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Buyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Buyer Documents Modal ────────────────────────────────────────────────────
function BuyerDocsModal({ buyer, onClose }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: planData } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('plot_id')
            .eq('buyer_user_id', buyer.id)
            .maybeSingle(),
          { label: 'Load buyer docs plan' }
        )

        if (!planData) {
          if (!cancelled) setDocs([])
          return
        }

        const { data: docData } = await runSupabaseRequest(
          () => supabase
            .from('documents')
            .select('id, name, category, file_url, is_buyer_visible, created_at')
            .eq('plot_id', planData.plot_id)
            .order('created_at', { ascending: false }),
          { label: 'Load buyer documents modal' }
        )

        if (!cancelled) setDocs(docData ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [buyer.id])

  const CATEGORY_LABEL = { legal: 'Legal', agreement: 'Agreement', tax: 'Tax', receipt: 'Receipt', other: 'Other' }

  return (
    <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">Documents — {buyer.full_name || buyer.email}</h2>
          <button className="dash-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="dash-form">
          {loading ? (
            <div className="dash-loading-inline">Loading…</div>
          ) : error ? (
            <p className="dash-error">{error}</p>
          ) : docs.length === 0 ? (
            <p className="dash-empty">No documents linked to this buyer's plot yet.</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Buyer Visible</th>
                    <th>Added</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => (
                    <tr key={doc.id} className="dash-table-row">
                      <td className="dash-table-name">{doc.name}</td>
                      <td>
                        <span className="dash-badge dash-badge--draft">
                          {CATEGORY_LABEL[doc.category] ?? doc.category}
                        </span>
                      </td>
                      <td>
                        {doc.is_buyer_visible
                          ? <span className="dash-badge dash-badge--ok">Visible</span>
                          : <span className="dash-badge dash-badge--draft">Hidden</span>}
                      </td>
                      <td style={{ fontSize: '1.3rem', color: '#636366' }}>
                        {new Date(doc.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#046ebc', fontSize: '1.3rem', fontWeight: 600 }}>
                          View ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="dash-form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <Link to="/admin/documents" className="dash-btn" onClick={onClose}>
              Manage Documents →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [buyers, setBuyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [docsFor, setDocsFor] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let profilesData
    try {
      ({ data: profilesData } = await runSupabaseRequest(
        () => supabase
          .from('profiles')
          .select('id, full_name, phone, role, created_at')
          .eq('role', 'buyer')
          .order('created_at', { ascending: false }),
        { label: 'Load buyer profiles' }
      ))
    } catch (profilesErr) {
      setError(profilesErr.message); setLoading(false); return
    }

    // Enrich buyers with their linked plot info
    const buyerIds = (profilesData ?? []).map(b => b.id)
    let plansByBuyer = {}
    if (buyerIds.length > 0) {
      const { data: plansData } = await runSupabaseRequest(
        () => supabase
          .from('payment_plans')
          .select('buyer_user_id, buyer_name, plot_id, plots(plot_number, site_layouts(name))')
          .in('buyer_user_id', buyerIds),
        { label: 'Load buyer payment plans' }
      )
      for (const p of plansData ?? []) {
        plansByBuyer[p.buyer_user_id] = p
      }
    }

    setBuyers((profilesData ?? []).map(b => ({
      ...b,
      plan: plansByBuyer[b.id] ?? null,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="dash-page"><div className="dash-loading-inline">Loading…</div></div>

  return (
    <>
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Customers</h1>
        <button className="dash-btn dash-btn--primary" onClick={() => setShowCreate(true)}>
          + Create Buyer Account
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-leads-search-wrap" style={{ marginBottom: '1.6rem' }}>
        <span className="material-symbols-outlined dash-leads-search-icon">search</span>
        <input
          className="dash-leads-search"
          type="text"
          placeholder="Search by name, phone, or layout…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {buyers.length === 0 ? (
          <div className="dash-empty">
            No buyer accounts yet. Create one to give a buyer access to their portal.
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
                  <th>Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyers.filter(b => {
                  if (!search.trim()) return true
                  const q = search.toLowerCase()
                  const layout = b.plan?.plots?.site_layouts
                  return (b.full_name?.toLowerCase().includes(q)) ||
                         (b.phone?.toLowerCase().includes(q)) ||
                         (layout?.name?.toLowerCase().includes(q))
                }).map(b => {
                  const plan = b.plan
                  const plot = plan?.plots
                  const layout = plot?.site_layouts
                  return (
                    <tr key={b.id} className="dash-table-row">
                      <td className="dash-table-name">{b.full_name ?? '—'}</td>
                      <td style={{ fontSize: '1.4rem', color: '#636366' }}>{b.phone ?? '—'}</td>
                      <td>
                        {plot ? (
                          <span className="dash-agent-tag">#{plot.plot_number}</span>
                        ) : (
                          <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>Not linked</span>
                        )}
                      </td>
                      <td style={{ fontSize: '1.4rem' }}>{layout?.name ?? '—'}</td>
                      <td style={{ fontSize: '1.3rem', color: '#8e8e93' }}>
                        {new Date(b.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <div className="dash-table-actions">
                          <button
                            className="dash-btn dash-btn--sm"
                            onClick={() => setDocsFor(b)}
                          >
                            Documents
                          </button>
                          {plan && (
                            <Link to="/admin/payments" className="dash-btn dash-btn--sm dash-btn--ghost">
                              Payments
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      )}

      {showCreate && (
        <CreateBuyerModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}

      {docsFor && (
        <BuyerDocsModal buyer={docsFor} onClose={() => setDocsFor(null)} />
      )}
    </div>
    <LeadPipeline />
    </>
  )
}
