import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import '../css/dashboard.css'

function isStaffRole(role) {
  return ['admin', 'owner', 'manager'].includes(role)
}

export default function LoginPage() {
  const { user, profile, signIn, loading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'buyer') {
        navigate('/my', { replace: true })
        return
      }

      if (isStaffRole(profile.role)) {
        navigate('/admin', { replace: true })
      }
    }
  }, [user, profile, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    setSubmitting(true)

    try {
      // Look up email by staff name using the RPC function
      const { data: email, error: rpcError } = await supabase.rpc('get_email_by_name', {
        staff_name: name.trim(),
      })

      if (rpcError) {
        setError('Unable to look up staff name. Please try again.')
        setSubmitting(false)
        return
      }

      if (!email) {
        setError('No staff account found with that name.')
        setSubmitting(false)
        return
      }

      // Sign in with the looked-up email and the provided password
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError('Invalid name or password.')
        setSubmitting(false)
      }
      // On success: onAuthStateChange fires → user set → useEffect navigates to /admin
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="dash-loading-screen">
        <div className="dash-loading-spinner" />
      </div>
    )
  }

  return (
    <div className="dash-login-page">
      <div className="dash-login-card">
        <div className="dash-login-brand">VCR Builders and Developers</div>
        <h1 className="dash-login-title">Admin Sign In</h1>
        <p className="dash-login-subtitle">VCR Builders &amp; Developers</p>

        <form className="dash-login-form" onSubmit={handleSubmit} noValidate>
          <div className="dash-form-group">
            <label className="dash-form-label" htmlFor="login-name">Name</label>
            <input
              id="login-name"
              type="text"
              className="dash-form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your full name"
            />
          </div>

          <div className="dash-form-group">
            <label className="dash-form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="dash-form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="dash-login-error">{error}</p>}

          <button type="submit" className="dash-login-btn" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
