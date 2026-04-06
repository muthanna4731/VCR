import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation } from '../../lib/supabaseRequest'

const PHONE_RE = /^[6-9]\d{9}$/

export default function EnquiryForm({ plotId, layoutId }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const validatePhone = useCallback((value) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return 'Phone number is required'
    if (!PHONE_RE.test(digits)) return 'Enter a valid 10-digit Indian mobile number'
    return ''
  }, [])

  const handlePhoneChange = useCallback((e) => {
    setPhone(e.target.value)
    if (phoneError) setPhoneError('')
  }, [phoneError])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const phoneValidationError = validatePhone(phone)
    if (phoneValidationError) {
      setPhoneError(phoneValidationError)
      return
    }

    setSubmitting(true)
    setPhoneError('')

    try {
      await runSupabaseMutation(
        () => supabase.from('enquiries').insert({
          plot_id: plotId || null,
          layout_id: layoutId || null,
          name: name.trim(),
          phone: phone.replace(/\D/g, ''),
        }),
        { label: 'Submit property enquiry' }
      )
      setSubmitted(true)
    } catch (_error) {
      setPhoneError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [name, phone, validatePhone, plotId, layoutId])

  if (submitted) {
    return (
      <div className="prop-enquiry">
        <div className="prop-enquiry-success">
          Thank you! We'll get back to you shortly.
        </div>
      </div>
    )
  }

  return (
    <div className="prop-enquiry">
      <div className="prop-enquiry-title">Interested? Leave your details</div>
      <form onSubmit={handleSubmit}>
        <div className="prop-enquiry-fields">
          <input
            className="prop-enquiry-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <div className="prop-enquiry-field-wrap">
            <input
              className={`prop-enquiry-input${phoneError ? ' prop-enquiry-input--error' : ''}`}
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={handlePhoneChange}
              required
            />
            {phoneError && (
              <div className="prop-enquiry-error">{phoneError}</div>
            )}
          </div>
        </div>
        <button
          className="prop-enquiry-submit"
          type="submit"
          disabled={submitting || !name.trim() || !phone.trim()}
        >
          {submitting ? 'Submitting...' : 'Submit Enquiry'}
        </button>
      </form>
    </div>
  )
}
