import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const INSTALLMENT_LABELS = ['Token', 'Booking Amount', '1st Installment', '2nd Installment', '3rd Installment', 'Final Payment', 'Registration']

function formatCurrency(n) {
  if (!n && n !== 0) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function isOverdue(inst) {
  return inst.status === 'pending' && inst.due_date && new Date(inst.due_date) < new Date()
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────
function PlanModal({ plot, onClose }) {
  const [plan, setPlan] = useState(null)
  const [installments, setInstallments] = useState([])
  const [planForm, setPlanForm] = useState({ buyer_name: '', buyer_phone: '', total_amount: '', notes: '', buyer_user_id: '' })
  const [buyerProfiles, setBuyerProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [newRow, setNewRow] = useState(null) // { label, amount, due_date, notes }
  const [isDirty, setIsDirty] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  function updatePlanForm(field, value) {
    setPlanForm(f => ({ ...f, [field]: value }))
    setIsDirty(true)
  }

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [{ data: planData }, { data: profileData }] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('id, plot_id, buyer_name, buyer_phone, total_amount, notes, buyer_user_id, payment_installments(id, installment_number, label, amount, due_date, paid_at, status, receipt_url, notes)')
            .eq('plot_id', plot.id)
            .maybeSingle(),
          { label: 'Load payment plan' }
        ),
        runSupabaseRequest(
          () => supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('role', 'buyer')
            .order('full_name'),
          { label: 'Load buyer profiles' }
        ),
      ])

      setBuyerProfiles(profileData ?? [])

      if (planData) {
        setPlan(planData)
        setPlanForm({
          buyer_name:    planData.buyer_name,
          buyer_phone:   planData.buyer_phone ?? '',
          total_amount:  planData.total_amount,
          notes:         planData.notes ?? '',
          buyer_user_id: planData.buyer_user_id ?? '',
        })
        const sorted = [...(planData.payment_installments ?? [])].sort((a, b) => a.installment_number - b.installment_number)
        setInstallments(sorted)
      } else {
        setPlan(null)
        setInstallments([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [plot.id])

  useEffect(() => { loadPlan() }, [loadPlan])

  async function savePlan(e) {
    e.preventDefault()
    if (!planForm.buyer_name.trim()) { setError('Buyer name is required.'); return }
    setSaving(true); setError(null)

    const planPayload = {
      buyer_name:    planForm.buyer_name.trim(),
      buyer_phone:   planForm.buyer_phone.trim() || null,
      total_amount:  Number(planForm.total_amount) || 0,
      notes:         planForm.notes.trim() || null,
      buyer_user_id: planForm.buyer_user_id || null,
    }

    if (plan) {
      try {
        await runSupabaseMutation(
          () => supabase.from('payment_plans').update(planPayload).eq('id', plan.id),
          { label: 'Update payment plan' }
        )
      } catch (err) {
        setError(err.message); setSaving(false); return
      }
    } else {
      let data
      try {
        ({ data } = await runSupabaseMutation(
          () => supabase.from('payment_plans')
            .insert({ plot_id: plot.id, ...planPayload })
            .select('id, plot_id, buyer_name, buyer_phone, total_amount, notes, buyer_user_id')
            .single(),
          { label: 'Create payment plan' }
        ))
      } catch (err) {
        setError(err.message); setSaving(false); return
      }
      setPlan(data)
    }
    setSaving(false)
    setIsDirty(false)
  }

  async function addInstallment() {
    if (!newRow || !newRow.label.trim() || !plan) return
    const num = installments.length + 1
    let data
    try {
      ({ data } = await runSupabaseMutation(
        () => supabase.from('payment_installments').insert({
          plan_id:            plan.id,
          installment_number: num,
          label:              newRow.label.trim(),
          amount:             Number(newRow.amount) || 0,
          due_date:           newRow.due_date || null,
          notes:              newRow.notes.trim() || null,
          status:             'pending',
        }).select('id, installment_number, label, amount, due_date, paid_at, status, receipt_url, notes').single(),
        { label: 'Add payment installment' }
      ))
    } catch (err) {
      setError(err.message); return
    }
    setInstallments(prev => [...prev, data])
    setNewRow(null)
  }

  async function markPaid(instId) {
    const now = new Date().toISOString()
    try {
      await runSupabaseMutation(
        () => supabase.from('payment_installments').update({ status: 'paid', paid_at: now }).eq('id', instId),
        { label: 'Mark installment paid' }
      )
      setInstallments(prev => prev.map(i => i.id === instId ? { ...i, status: 'paid', paid_at: now } : i))
    } catch (err) {
      setError(err.message)
    }
  }

  async function markUnpaid(instId) {
    try {
      await runSupabaseMutation(
        () => supabase.from('payment_installments').update({ status: 'pending', paid_at: null }).eq('id', instId),
        { label: 'Mark installment unpaid' }
      )
      setInstallments(prev => prev.map(i => i.id === instId ? { ...i, status: 'pending', paid_at: null } : i))
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteInstallment(instId) {
    setDeleteConfirmId(null)
    try {
      await runSupabaseMutation(
        () => supabase.from('payment_installments').delete().eq('id', instId),
        { label: 'Delete installment' }
      )
      setInstallments(prev => prev.filter(i => i.id !== instId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReceiptUpload(inst, file) {
    if (!file || !plan) return
    setUploadingId(inst.id)
    const ext = file.name.split('.').pop()
    const path = `${plan.id}/${inst.id}.${ext}`
    try {
      await runSupabaseMutation(
        () => supabase.storage.from('payment-receipts').upload(path, file, { upsert: true }),
        { label: 'Upload receipt' }
      )
      const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(path)
      const receipt_url = urlData.publicUrl
      await runSupabaseMutation(
        () => supabase.from('payment_installments').update({ receipt_url }).eq('id', inst.id),
        { label: 'Save receipt URL' }
      )
      setInstallments(prev => prev.map(i => i.id === inst.id ? { ...i, receipt_url } : i))
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploadingId(null)
    }
  }

  const totalInstAmt = installments.reduce((s, i) => s + Number(i.amount), 0)

  // Quick % split presets: generate installments from percentages of total
  const PCT_SPLITS = [
    { label: '50% – 50%', pcts: [50, 50] },
    { label: '30% – 30% – 40%', pcts: [30, 30, 40] },
    { label: '30% – 30% – 30% – 10%', pcts: [30, 30, 30, 10] },
    { label: '25% × 4', pcts: [25, 25, 25, 25] },
    { label: '10% – 40% – 50%', pcts: [10, 40, 50] },
  ]

  async function applyPctSplit(pcts) {
    if (!plan || !planForm.total_amount) return
    const total = Number(planForm.total_amount)
    if (!total) return
    if (installments.length > 0 && !window.confirm('This will replace all existing installments. Continue?')) return
    try {
      for (const inst of installments) {
        await runSupabaseMutation(
          () => supabase.from('payment_installments').delete().eq('id', inst.id),
          { label: 'Replace installment split' }
        )
      }
      const splitLabels = ['Token / Booking', '1st Installment', '2nd Installment', '3rd Installment', 'Final Payment', 'Registration']
      const newInsts = []
      for (let i = 0; i < pcts.length; i++) {
        const amount = Math.round(total * pcts[i] / 100)
        const { data } = await runSupabaseMutation(
          () => supabase.from('payment_installments').insert({
            plan_id: plan.id,
            installment_number: i + 1,
            label: splitLabels[i] ?? `Installment ${i + 1}`,
            amount,
            status: 'pending',
          }).select('id, installment_number, label, amount, due_date, paid_at, status, receipt_url, notes').single(),
          { label: 'Create split installment' }
        )
        if (data) newInsts.push(data)
      }
      setInstallments(newInsts)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true">
      <div className="dash-modal dash-modal--wide">
        <div className="dash-modal-header">
          <div>
            <h2 className="dash-modal-title">Payment Plan — Plot #{plot.plot_number}</h2>
            <p className="dash-pay-modal-sub">{plot.layout_name} · {plot.dimensions}</p>
          </div>
          <button className="dash-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="dash-form"><div className="dash-loading-spinner"></div></div>
        ) : (
          <>
            {error && <div className="dash-form"><p className="dash-error">{error}</p></div>}

            {/* Plan form */}
            <form className="dash-form dash-pay-plan-form" onSubmit={savePlan}>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Buyer Name *</label>
                  <input className="dash-form-input" value={planForm.buyer_name}
                    onChange={e => updatePlanForm('buyer_name', e.target.value)}
                    placeholder="Buyer's full name" />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Buyer Phone</label>
                  <input className="dash-form-input" value={planForm.buyer_phone}
                    onChange={e => updatePlanForm('buyer_phone', e.target.value)}
                    placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Total Sale Amount (₹)</label>
                  <input className="dash-form-input" type="number" min="0" value={planForm.total_amount}
                    onChange={e => updatePlanForm('total_amount', e.target.value)}
                    placeholder="0" />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label">Notes</label>
                  <input className="dash-form-input" value={planForm.notes}
                    onChange={e => updatePlanForm('notes', e.target.value)}
                    placeholder="Any remarks…" />
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label">Buyer Portal Account</label>
                  <select className="dash-form-select" value={planForm.buyer_user_id}
                    onChange={e => updatePlanForm('buyer_user_id', e.target.value)}>
                    <option value="">— Not linked —</option>
                    {buyerProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name ?? 'Unnamed'}{p.phone ? ` · ${p.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '1.2rem', color: '#8e8e93', marginTop: '0.4rem', display: 'block' }}>
                    Links buyer to their /my portal. Create their account in Customers page first.
                  </span>
                </div>
              </div>
              <div className="dash-form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0, alignItems: 'center' }}>
                {isDirty && (
                  <span style={{ fontSize: '1.3rem', color: '#c77700', fontWeight: 600 }}>
                    ⚠ Unsaved changes
                  </span>
                )}
                <button type="submit" className="dash-btn dash-btn--primary dash-btn--sm" disabled={saving}
                  style={isDirty ? { boxShadow: '0 0 0 3px rgba(199,119,0,0.25)' } : {}}>
                  {saving ? 'Saving…' : plan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>

            {/* Installments */}
            {plan && (
              <div className="dash-pay-installments">
                {/* % split quick-pick */}
                <div className="dash-pay-split-row">
                  <span className="dash-pay-split-label">Quick split:</span>
                  {PCT_SPLITS.map(s => (
                    <button
                      key={s.label}
                      type="button"
                      className="dash-pay-split-btn"
                      onClick={() => applyPctSplit(s.pcts)}
                      title={`Replace installments with ${s.label} split`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Pipeline visual */}
                {installments.length > 0 && (
                  <div className="dash-pay-pipeline">
                    {installments.map((inst, idx) => {
                      const overdue = isOverdue(inst)
                      const isPaid = inst.status === 'paid'
                      const isCurrent = !isPaid && !overdue && installments.slice(0, idx).every(i => i.status === 'paid')
                      const pct = totalInstAmt > 0 ? Math.round((Number(inst.amount) / totalInstAmt) * 100) : 0
                      return (
                        <div
                          key={inst.id}
                          className={`dash-pay-pipeline-step${isPaid ? ' dash-pay-pipeline-step--paid' : overdue ? ' dash-pay-pipeline-step--overdue' : isCurrent ? ' dash-pay-pipeline-step--current' : ''}`}
                        >
                          <div className="dash-pay-pipeline-pill">
                            {isPaid ? '✓' : idx + 1}
                          </div>
                          <div className="dash-pay-pipeline-label" title={inst.label}>{inst.label}</div>
                          <div className="dash-pay-pipeline-amount">{formatCurrency(inst.amount)}</div>
                          <div className="dash-pay-pipeline-pct">{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Label</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Paid On</th>
                        <th>Receipt</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst, idx) => {
                        const overdue = isOverdue(inst)
                        return (
                          <tr key={inst.id} className="dash-table-row">
                            <td style={{ color: '#8e8e93', fontSize: '1.2rem' }}>{idx + 1}</td>
                            <td className="dash-table-name">{inst.label}</td>
                            <td>{formatCurrency(inst.amount)}</td>
                            <td style={{ fontSize: '1.3rem', color: overdue ? '#ff3b30' : '#636366' }}>
                              {inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td>
                              {inst.status === 'paid' ? (
                                <span className="dash-badge dash-badge--ok">Paid</span>
                              ) : overdue ? (
                                <span className="dash-badge dash-badge--overdue">Overdue</span>
                              ) : (
                                <span className="dash-badge dash-badge--draft">Pending</span>
                              )}
                            </td>
                            <td style={{ fontSize: '1.3rem', color: '#636366' }}>
                              {inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td>
                              {inst.receipt_url ? (
                                <a className="dash-pay-receipt-link" href={inst.receipt_url} target="_blank" rel="noopener noreferrer">
                                  View ↗
                                </a>
                              ) : (
                                <label className="dash-upload-label" style={{ fontSize: '1.2rem', padding: '0.3rem 0.8rem' }}>
                                  {uploadingId === inst.id ? 'Uploading…' : 'Upload'}
                                  <input type="file" accept="image/*,.pdf" hidden
                                    onChange={e => handleReceiptUpload(inst, e.target.files?.[0])}
                                    disabled={uploadingId !== null} />
                                </label>
                              )}
                            </td>
                            <td>
                              <div className="dash-table-actions">
                                {inst.status === 'pending' ? (
                                  <button className="dash-btn dash-btn--sm dash-btn--primary" onClick={() => markPaid(inst.id)}>
                                    Mark Paid
                                  </button>
                                ) : (
                                  <button className="dash-btn dash-btn--sm dash-btn--ghost" onClick={() => markUnpaid(inst.id)}>
                                    Undo
                                  </button>
                                )}
                                {deleteConfirmId === inst.id ? (
                                  <>
                                    <span style={{ fontSize: '1.3rem', color: '#ff3b30', fontWeight: 600, whiteSpace: 'nowrap' }}>Delete?</span>
                                    <button className="dash-btn dash-btn--sm dash-btn--danger" onClick={() => deleteInstallment(inst.id)}>Yes</button>
                                    <button className="dash-btn dash-btn--sm" onClick={() => setDeleteConfirmId(null)}>No</button>
                                  </>
                                ) : (
                                  <button className="dash-btn dash-btn--sm dash-btn--danger" onClick={() => setDeleteConfirmId(inst.id)}>
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {/* New row form */}
                      {newRow && (
                        <tr className="dash-pay-new-row">
                          <td style={{ color: '#8e8e93', fontSize: '1.2rem' }}>{installments.length + 1}</td>
                          <td>
                            <select className="dash-form-select" style={{ fontSize: '1.3rem', padding: '0.5rem 0.8rem' }}
                              value={newRow.label}
                              onChange={e => setNewRow(r => ({ ...r, label: e.target.value }))}>
                              <option value="">Pick label…</option>
                              {INSTALLMENT_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                              <option value="__custom__">Custom…</option>
                            </select>
                            {newRow.label === '__custom__' && (
                              <input className="dash-form-input" style={{ marginTop: '0.4rem', fontSize: '1.3rem' }}
                                placeholder="Custom label"
                                onChange={e => setNewRow(r => ({ ...r, label: e.target.value }))} />
                            )}
                          </td>
                          <td>
                            <input className="dash-form-input" type="number" min="0"
                              style={{ fontSize: '1.3rem', padding: '0.5rem 0.8rem' }}
                              placeholder="0" value={newRow.amount}
                              onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))} />
                          </td>
                          <td>
                            <input className="dash-form-input" type="date"
                              style={{ fontSize: '1.3rem', padding: '0.5rem 0.8rem' }}
                              value={newRow.due_date}
                              onChange={e => setNewRow(r => ({ ...r, due_date: e.target.value }))} />
                          </td>
                          <td colSpan={4}>
                            <div className="dash-table-actions">
                              <button className="dash-btn dash-btn--sm dash-btn--primary" onClick={addInstallment}>
                                Add
                              </button>
                              <button className="dash-btn dash-btn--sm" onClick={() => setNewRow(null)}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!newRow && (
                  <button className="dash-btn dash-btn--sm" style={{ marginTop: '1rem' }}
                    onClick={() => setNewRow({ label: '', amount: '', due_date: '', notes: '' })}>
                    + Add Installment
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PaymentTracker() {
  const [plots, setPlots] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterLayout, setFilterLayout] = useState('')
  const [selectedPlot, setSelectedPlot] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [plotsRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('plots')
            .select('id, plot_number, dimensions, dimension_sqft, status, layout_id, site_layouts(id, name)')
            .in('status', ['booked', 'sold'])
            .order('layout_id')
            .order('plot_number'),
          { label: 'Load booked and sold plots' }
        ),
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, name').order('name'),
          { label: 'Load layouts for payments' }
        ),
      ])

      const plotIds = plotsRes.data.map(p => p.id)
      let plans = []
      if (plotIds.length > 0) {
        const { data: planData } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('plot_id, buyer_name, buyer_phone, total_amount, id')
            .in('plot_id', plotIds),
          { label: 'Load payment plans for tracker' }
        )
        plans = planData ?? []
      }

      const planIds = plans.map(p => p.id)
      let installSummary = {}
      if (planIds.length > 0) {
        const today = new Date()
        const { data: instData } = await runSupabaseRequest(
          () => supabase
            .from('payment_installments')
            .select('plan_id, status, amount, due_date')
            .in('plan_id', planIds),
          { label: 'Load installment summaries' }
        )
        if (instData) {
          for (const inst of instData) {
            if (!installSummary[inst.plan_id]) installSummary[inst.plan_id] = { total: 0, paid: 0, totalAmt: 0, paidAmt: 0, overdue: 0 }
            installSummary[inst.plan_id].total++
            installSummary[inst.plan_id].totalAmt += Number(inst.amount)
            if (inst.status === 'paid') {
              installSummary[inst.plan_id].paid++
              installSummary[inst.plan_id].paidAmt += Number(inst.amount)
            } else if (inst.due_date && new Date(inst.due_date) < today) {
              installSummary[inst.plan_id].overdue++
            }
          }
        }
      }

      const planByPlotId = Object.fromEntries(plans.map(p => [p.plot_id, { ...p, summary: installSummary[p.id] ?? null }]))

      setPlots(plotsRes.data.map(p => ({
        ...p,
        layout_name: p.site_layouts?.name ?? '—',
        plan: planByPlotId[p.id] ?? null,
      })))
      setLayouts(layoutsRes.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filterLayout ? plots.filter(p => p.layout_id === filterLayout) : plots
  const totalOverdue = plots.reduce((s, p) => s + (p.plan?.summary?.overdue ?? 0), 0)

  if (loading) return <div className="dash-page"><div className="dash-loading-spinner"></div></div>

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Payments</h1>
        <span className="dash-page-count">{filtered.length} booked/sold plots</span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {totalOverdue > 0 && (
        <div className="dash-due-alert">
          <span className="dash-due-alert-icon">⚠️</span>
          <span>
            <strong>{totalOverdue} overdue installment{totalOverdue > 1 ? 's' : ''}</strong> across your plots — highlighted below.
          </span>
        </div>
      )}

      <div className="dash-filter-bar">
        <select className="dash-filter-select" value={filterLayout}
          onChange={e => setFilterLayout(e.target.value)}>
          <option value="">All Layouts</option>
          {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {filterLayout && (
          <button className="dash-btn dash-btn--ghost dash-btn--sm" onClick={() => setFilterLayout('')}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="dash-empty">No booked or sold plots yet.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Plot</th>
                <th>Layout</th>
                <th>Dimensions</th>
                <th>Buyer</th>
                <th>Sale Amount</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(plot => {
                const plan = plot.plan
                const summary = plan?.summary
                const pct = summary?.totalAmt > 0 ? (summary.paidAmt / summary.totalAmt) * 100 : 0
                const hasOverdue = (summary?.overdue ?? 0) > 0
                return (
                  <tr key={plot.id} className={`dash-table-row${hasOverdue ? ' dash-table-row--overdue' : ''}`}>
                    <td className="dash-table-name">#{plot.plot_number}</td>
                    <td>{plot.layout_name}</td>
                    <td style={{ fontSize: '1.3rem', color: '#636366' }}>{plot.dimensions}</td>
                    <td>
                      {plan ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{plan.buyer_name}</div>
                          {plan.buyer_phone && <div className="dash-table-sub">{plan.buyer_phone}</div>}
                        </>
                      ) : <span style={{ color: '#aeaeb2', fontSize: '1.3rem' }}>No plan</span>}
                    </td>
                    <td>{plan ? formatCurrency(plan.total_amount) : '—'}</td>
                    <td style={{ minWidth: '14rem' }}>
                      {summary ? (
                        <>
                          <div className="dash-pay-mini-bar">
                            <div className="dash-pay-mini-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="dash-pay-mini-label">
                            {summary.paid}/{summary.total} paid · {formatCurrency(summary.paidAmt)}
                          </div>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <button
                        className="dash-btn dash-btn--sm dash-btn--primary"
                        onClick={() => setSelectedPlot(plot)}
                      >
                        Manage Plan
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlot && (
        <PlanModal
          plot={selectedPlot}
          onClose={() => { setSelectedPlot(null); load() }}
        />
      )}
    </div>
  )
}
