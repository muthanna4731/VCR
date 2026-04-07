import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation } from '../../lib/supabaseRequest'

const EMPTY_FORM = {
  visitor_name: '',
  visitor_phone: '',
  scheduled_at: '',
  notes: '',
}

export default function VisitBookingModal({ layout, isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const firstInputRef = useRef(null)

  // Focus trap on open
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM)
      setSubmitted(false)
      setError(null)
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.visitor_name.trim()) { setError('Please enter your name.'); return }
    if (!form.visitor_phone.trim()) { setError('Please enter your phone number.'); return }
    if (!form.scheduled_at) { setError('Please pick a preferred date and time.'); return }

    setSubmitting(true)
    setError(null)

    try {
      // Create a lead for this visitor (public can insert into enquiries)
      const leadResult = await runSupabaseMutation(
        () => supabase.from('enquiries').insert({
          name:        form.visitor_name.trim(),
          phone:       form.visitor_phone.trim(),
          layout_id:   layout.id,
          lead_status: 'visit_scheduled',
          channel:     'website',
        }).select('id').single(),
        { label: 'Create lead from visit booking' }
      )

      await runSupabaseMutation(
        () => supabase.from('visit_schedules').insert({
          layout_id:     layout.id,
          visitor_name:  form.visitor_name.trim(),
          visitor_phone: form.visitor_phone.trim(),
          scheduled_at:  form.scheduled_at,
          notes:         form.notes.trim() || null,
          status:        'pending',
          enquiry_id:    leadResult.data?.id ?? null,
        }),
        { label: 'Book site visit' }
      )
      setSubmitted(true)
    } catch (_error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Min datetime: now (no booking in the past)
  const minDatetime = new Date(Date.now() + 3600_000).toISOString().slice(0, 16)

  return createPortal(
    <div
      className="prop-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Book a Site Visit"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="prop-visit-modal">
        <div className="prop-visit-modal-header">
          <div>
            <h2 className="prop-visit-modal-title">Book a Site Visit</h2>
            <p className="prop-visit-modal-sub">{layout.name}</p>
          </div>
          <button className="prop-visit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {submitted ? (
          <div className="prop-visit-modal-success">
            <div className="prop-visit-modal-success-icon">✓</div>
            <h3 className="prop-visit-modal-success-title">Visit Requested!</h3>
            <p className="prop-visit-modal-success-text">
              Our team will confirm your visit shortly. We'll reach out to {form.visitor_phone} to finalize the time.
            </p>
            <button className="prop-visit-modal-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="prop-visit-modal-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="prop-visit-modal-error">{error}</p>}

            <div className="prop-visit-form-group">
              <label className="prop-visit-form-label">Your Name *</label>
              <input
                ref={firstInputRef}
                className="prop-visit-form-input"
                name="visitor_name"
                value={form.visitor_name}
                onChange={handleChange}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>

            <div className="prop-visit-form-group">
              <label className="prop-visit-form-label">Phone Number *</label>
              <input
                className="prop-visit-form-input"
                name="visitor_phone"
                value={form.visitor_phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="prop-visit-form-group">
              <label className="prop-visit-form-label">Preferred Date & Time *</label>
              <input
                className="prop-visit-form-input"
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                onChange={handleChange}
                min={minDatetime}
              />
              <span className="prop-visit-form-hint">We'll confirm or suggest an alternate time.</span>
            </div>

            <div className="prop-visit-form-group">
              <label className="prop-visit-form-label">Message (optional)</label>
              <textarea
                className="prop-visit-form-textarea"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any specific plots or questions you'd like to discuss…"
                rows={3}
              />
            </div>

            <button type="submit" className="prop-visit-modal-btn" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Request Visit'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
