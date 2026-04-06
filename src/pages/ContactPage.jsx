import { useState } from 'react'
import '../css/properties.css'
import { supabase } from '../lib/supabase'
import { runSupabaseMutation } from '../lib/supabaseRequest'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await runSupabaseMutation(
        () => supabase
          .from('contact_enquiries')
          .insert([{ name: form.name, phone: form.phone, email: form.email || null, message: form.message }]),
        { label: 'Submit contact enquiry' }
      )
      setSubmitted(true)
    } catch (_error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-page">
      <div className="container-container">
        <h1 className="contact-page-title">Get in Touch</h1>
        <p className="contact-page-subtitle">
          Interested in a plot or have a question? Leave your details and our team will reach out.
        </p>

        {submitted ? (
          <div className="contact-success">
            <div className="contact-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#046ebc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="contact-success-title">We'll be in touch soon!</div>
            <div className="contact-success-text">Thanks for reaching out. Our team usually responds within one business day.</div>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-row">
              <div className="contact-form-group">
                <label className="contact-form-label" htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="contact-form-input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="contact-form-group">
                <label className="contact-form-label" htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="contact-form-input"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="contact-form-group">
              <label className="contact-form-label" htmlFor="email">Email <span className="contact-form-optional">(optional)</span></label>
              <input
                id="email"
                name="email"
                type="email"
                className="contact-form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="contact-form-group">
              <label className="contact-form-label" htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                className="contact-form-textarea"
                placeholder="Tell us what you're looking for…"
                rows={5}
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            {error && <div className="contact-form-error">{error}</div>}

            <button type="submit" className="contact-form-submit button-button-round button-color-primary" disabled={submitting}>
              <div className="button-content">
                <div className="button-button-round-text">
                  <span data-text={submitting ? 'Sending…' : 'Send Message'}>
                    {submitting ? 'Sending…' : 'Send Message'}
                  </span>
                </div>
              </div>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
