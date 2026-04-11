import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, AMENITY_LABELS } from '../../data/mockData'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const STATUSES = ['available', 'negotiation', 'booked', 'sold', 'blocked']
const FACINGS = ['North', 'East', 'South', 'West']
const ALL_AMENITIES = Object.keys(AMENITY_LABELS)

function mapPlot(row) {
  return {
    id: row.id,
    layoutId: row.layout_id,
    plotNumber: row.plot_number,
    dimensions: row.dimensions,
    dimensionSqft: String(row.dimension_sqft),
    facing: row.facing,
    status: row.status,
    pricePerSqft: String(row.price_per_sqft),
    totalPrice: String(row.total_price),
    cornerPlot: row.corner_plot,
    roadWidth: row.road_width ?? '',
    amenities: row.amenities ?? [],
    layoutName: row.site_layouts?.name ?? '',
    cityName: row.site_layouts?.cities?.name ?? '',
  }
}

export default function PlotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [originalBuyerName, setOriginalBuyerName] = useState('')
  const [originalBuyerPhone, setOriginalBuyerPhone] = useState('')
  const [existingPlanId, setExistingPlanId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [{ data }, { data: planData }] = await Promise.all([
          runSupabaseRequest(
            () => supabase
              .from('plots')
              .select('id, layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities, site_layouts(name, cities(name))')
              .eq('id', id)
              .single(),
            { label: 'Load plot detail' }
          ),
          runSupabaseRequest(
            () => supabase
              .from('payment_plans')
              .select('id, buyer_name, buyer_phone')
              .eq('plot_id', id)
              .maybeSingle(),
            { label: 'Load plot buyer info' }
          ),
        ])

        if (cancelled) return
        const mapped = mapPlot(data)
        setForm(mapped)
        setOriginal(mapped)
        setBuyerName(planData?.buyer_name ?? '')
        setBuyerPhone(planData?.buyer_phone ?? '')
        setOriginalBuyerName(planData?.buyer_name ?? '')
        setOriginalBuyerPhone(planData?.buyer_phone ?? '')
        setExistingPlanId(planData?.id ?? null)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'pricePerSqft' || field === 'dimensionSqft') {
        const sqft = parseInt(field === 'dimensionSqft' ? value : next.dimensionSqft, 10) || 0
        const pps  = parseInt(field === 'pricePerSqft' ? value : next.pricePerSqft, 10) || 0
        next.totalPrice = String(sqft * pps)
      }
      return next
    })
    setSaved(false)
  }

  const isBuyerDirty = buyerName !== originalBuyerName || buyerPhone !== originalBuyerPhone
  const isDirty = (form && original && JSON.stringify(form) !== JSON.stringify(original)) || isBuyerDirty

  function toggleAmenity(key) {
    setForm(f => {
      const amenities = f.amenities.includes(key)
        ? f.amenities.filter(a => a !== key)
        : [...f.amenities, key]
      return { ...f, amenities }
    })
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await runSupabaseMutation(
        () => supabase
          .from('plots')
          .update({
            plot_number: form.plotNumber.trim(),
            dimensions: form.dimensions.trim(),
            dimension_sqft: parseInt(form.dimensionSqft, 10) || 0,
            facing: form.facing,
            status: form.status,
            price_per_sqft: parseInt(form.pricePerSqft, 10) || 0,
            total_price: parseInt(form.totalPrice, 10) || 0,
            corner_plot: form.cornerPlot,
            road_width: form.roadWidth.trim() || null,
            amenities: form.amenities,
          })
          .eq('id', id),
        { label: 'Save plot detail' }
      )

      // Save buyer info to payment_plans
      if (isBuyerDirty) {
        const buyerPayload = {
          buyer_name: buyerName.trim() || null,
          buyer_phone: buyerPhone.trim() || null,
        }

        if (existingPlanId) {
          // Update existing plan
          await runSupabaseMutation(
            () => supabase
              .from('payment_plans')
              .update(buyerPayload)
              .eq('id', existingPlanId),
            { label: 'Update buyer info' }
          )
        } else if (buyerName.trim()) {
          // Create new plan with buyer info
          const { data: newPlan } = await runSupabaseMutation(
            () => supabase
              .from('payment_plans')
              .insert({
                plot_id: id,
                ...buyerPayload,
                total_amount: parseInt(form.totalPrice, 10) || 0,
              })
              .select('id')
              .single(),
            { label: 'Create payment plan with buyer' }
          )
          setExistingPlanId(newPlan.id)
        }

        setOriginalBuyerName(buyerName)
        setOriginalBuyerPhone(buyerPhone)
      }

      setOriginal(form)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading-spinner"></div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="dash-page">
        <p className="dash-error">{error ?? 'Plot not found.'}</p>
        <Link to="/admin/plots" className="dash-btn">← Back to Plots</Link>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div className="dash-breadcrumb">
          <button className="dash-back-btn" onClick={() => { if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return; navigate('/admin/plots') }}>
            ← Plots
          </button>
          <span className="dash-breadcrumb-sep">/</span>
          <span>{form.layoutName}</span>
          <span className="dash-breadcrumb-sep">/</span>
          <span>Plot {original?.plotNumber}</span>
        </div>
      </div>

      <div className="dash-detail-layout">
        <form className="dash-form dash-form--detail" onSubmit={handleSave}>
          <h2 className="dash-section-title">Plot Details</h2>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-number">Plot Number *</label>
              <input
                id="pd-number"
                type="text"
                className="dash-form-input"
                value={form.plotNumber}
                onChange={e => set('plotNumber', e.target.value)}
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-facing">Facing *</label>
              <select
                id="pd-facing"
                className="dash-form-select"
                value={form.facing}
                onChange={e => set('facing', e.target.value)}
              >
                {FACINGS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-dims">Dimensions *</label>
              <input
                id="pd-dims"
                type="text"
                className="dash-form-input"
                value={form.dimensions}
                onChange={e => set('dimensions', e.target.value)}
                placeholder="40x60"
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-sqft">Area (sqft) *</label>
              <input
                id="pd-sqft"
                type="number"
                className="dash-form-input"
                value={form.dimensionSqft}
                onChange={e => set('dimensionSqft', e.target.value)}
                min="0"
                required
              />
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-status">Status *</label>
              <select
                id="pd-status"
                className="dash-form-select"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-road">Road Width</label>
              <input
                id="pd-road"
                type="text"
                className="dash-form-input"
                value={form.roadWidth}
                onChange={e => set('roadWidth', e.target.value)}
                placeholder="30ft"
              />
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-ppsqft">Price / sqft (₹) *</label>
              <input
                id="pd-ppsqft"
                type="number"
                className="dash-form-input"
                value={form.pricePerSqft}
                onChange={e => set('pricePerSqft', e.target.value)}
                min="0"
                required
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-total">Total Price (₹) *</label>
              <input
                id="pd-total"
                type="number"
                className="dash-form-input"
                value={form.totalPrice}
                onChange={e => set('totalPrice', e.target.value)}
                min="0"
                required
              />
            </div>
          </div>

          <div className="dash-form-check" style={{ marginBottom: '2rem' }}>
            <input
              id="pd-corner"
              type="checkbox"
              checked={form.cornerPlot}
              onChange={e => set('cornerPlot', e.target.checked)}
            />
            <label htmlFor="pd-corner">Corner Plot</label>
          </div>

          <h2 className="dash-section-title" style={{ marginTop: '2.4rem' }}>Buyer Information</h2>
          <p className="dash-form-hint" style={{ marginBottom: '1.2rem' }}>
            Adding a name here creates a customer entry visible under Customers.
          </p>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-buyer-name">Buyer Name *</label>
              <input
                id="pd-buyer-name"
                type="text"
                className="dash-form-input"
                value={buyerName}
                onChange={e => { setBuyerName(e.target.value); setSaved(false) }}
                placeholder="Buyer's full name"
              />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label" htmlFor="pd-buyer-phone">Buyer Phone</label>
              <input
                id="pd-buyer-phone"
                type="text"
                className="dash-form-input"
                value={buyerPhone}
                onChange={e => { setBuyerPhone(e.target.value); setSaved(false) }}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="dash-form-group">
            <span className="dash-form-label">Amenities</span>
            <div className="dash-amenity-checks">
              {ALL_AMENITIES.map(key => (
                <label key={key} className="dash-form-check">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(key)}
                    onChange={() => toggleAmenity(key)}
                  />
                  {AMENITY_LABELS[key]}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="dash-error">{error}</p>}
          {saved && <p className="dash-success">Changes saved.</p>}

          <div className="dash-form-actions">
            <button
              type="button"
              className="dash-btn"
              onClick={() => {
                if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return
                navigate('/admin/plots')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn dash-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        <aside className="dash-detail-aside">
          <div className="dash-info-card">
            <div className="dash-info-label">Layout</div>
            <div className="dash-info-value">{form.layoutName}</div>
            <div className="dash-info-sub">{form.cityName}</div>
          </div>
          <Link
            to={`/admin/layouts/${form.layoutId}/overlay`}
            className="dash-btn dash-btn--full"
          >
            Edit Site Map Overlay →
          </Link>
        </aside>
      </div>
    </div>
  )
}
