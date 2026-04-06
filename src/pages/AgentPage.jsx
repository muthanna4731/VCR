import { useState, useEffect } from 'react'
import '../css/agent.css'
import { supabase } from '../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../lib/supabaseRequest'

// Haversine distance in metres between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const φ1 = toRad(lat1), φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const STEPS = { SELECT: 'select', FORM: 'form', LOCATING: 'locating', RESULT: 'result' }

export default function AgentPage() {
  const [agents, setAgents] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [agentId, setAgentId] = useState('')
  const [layoutId, setLayoutId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [step, setStep] = useState(STEPS.SELECT)
  const [result, setResult] = useState(null) // { withinFence, distanceM, agentName, layoutName }
  const [gpsError, setGpsError] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [agentsRes, layoutsRes] = await Promise.all([
          runSupabaseRequest(
            () => supabase.from('agents').select('id, name').eq('is_active', true).order('name'),
            { label: 'Load active agents' }
          ),
          runSupabaseRequest(
            () => supabase.from('site_layouts').select('id, name, latitude, longitude, geofence_radius_m').eq('is_published', true).order('name'),
            { label: 'Load published layouts for agent check-in' }
          ),
        ])
        setAgents(agentsRes.data ?? [])
        setLayouts(layoutsRes.data ?? [])
      } catch (error) {
        setSubmitError(error.message)
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  function handleSelectContinue(e) {
    e.preventDefault()
    if (!agentId || !layoutId) return
    setStep(STEPS.FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setGpsError(null)
    setStep(STEPS.LOCATING)

    const layout = layouts.find(l => l.id === layoutId)
    const agent = agents.find(a => a.id === agentId)

    // Try to get GPS
    function onGpsSuccess(pos) {
      const { latitude: agentLat, longitude: agentLon } = pos.coords
      let is_within_geofence = null
      let distance_m = null

      if (layout?.latitude && layout?.longitude) {
        const dist = haversineDistance(agentLat, agentLon, layout.latitude, layout.longitude)
        distance_m = Math.round(dist * 10) / 10
        is_within_geofence = dist <= (layout.geofence_radius_m ?? 200)
      }

      saveLog({ agentLat, agentLon, is_within_geofence, distance_m, agent, layout })
    }

    function onGpsError(err) {
      // GPS failed — still log without coords
      saveLog({ agentLat: null, agentLon: null, is_within_geofence: null, distance_m: null, agent, layout })
      setGpsError(err.message)
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onGpsSuccess, onGpsError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    } else {
      saveLog({ agentLat: null, agentLon: null, is_within_geofence: null, distance_m: null, agent, layout })
    }
  }

  async function saveLog({ agentLat, agentLon, is_within_geofence, distance_m, agent, layout }) {
    try {
      await runSupabaseMutation(
        () => supabase.from('agent_presence_logs').insert({
          agent_id:           agentId,
          layout_id:          layoutId,
          client_name:        clientName.trim() || null,
          client_phone:       clientPhone.trim() || null,
          latitude:           agentLat,
          longitude:          agentLon,
          is_within_geofence,
          distance_m,
          notes:              notes.trim() || null,
        }),
        { label: 'Save agent presence log' }
      )
    } catch (error) {
      setSubmitError(error.message)
      setStep(STEPS.FORM)
      return
    }

    setResult({ withinFence: is_within_geofence, distanceM: distance_m, agentName: agent?.name, layoutName: layout?.name })
    setStep(STEPS.RESULT)
  }

  function reset() {
    setAgentId('')
    setLayoutId('')
    setClientName('')
    setClientPhone('')
    setNotes('')
    setResult(null)
    setGpsError(null)
    setSubmitError(null)
    setStep(STEPS.SELECT)
  }

  if (loadingData) {
    return (
      <div className="agent-page">
        <div className="agent-loading">
          <div className="agent-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="agent-page">
      <div className="agent-shell">

        {/* Header */}
        <div className="agent-header">
          <div className="agent-header-brand">VCR</div>
          <div className="agent-header-sub">Agent Check-In</div>
        </div>

        {/* Step 1: Select agent + layout */}
        {step === STEPS.SELECT && (
          <form className="agent-form" onSubmit={handleSelectContinue}>
            <div className="agent-form-group">
              <label className="agent-label">Who are you?</label>
              <select
                className="agent-select"
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                required
              >
                <option value="">Select your name…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="agent-form-group">
              <label className="agent-label">Which site are you visiting?</label>
              <select
                className="agent-select"
                value={layoutId}
                onChange={e => setLayoutId(e.target.value)}
                required
              >
                <option value="">Select layout…</option>
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <button type="submit" className="agent-btn" disabled={!agentId || !layoutId}>
              Continue →
            </button>
          </form>
        )}

        {/* Step 2: Client info */}
        {step === STEPS.FORM && (
          <form className="agent-form" onSubmit={handleSubmit}>
            <div className="agent-form-context">
              <span className="agent-form-context-name">{agents.find(a => a.id === agentId)?.name}</span>
              <span className="agent-form-context-sep"> at </span>
              <span className="agent-form-context-layout">{layouts.find(l => l.id === layoutId)?.name}</span>
            </div>

            <div className="agent-form-group">
              <label className="agent-label">Client Name</label>
              <input
                className="agent-input"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Who are you meeting?"
                autoComplete="name"
              />
            </div>

            <div className="agent-form-group">
              <label className="agent-label">Client Phone</label>
              <input
                className="agent-input"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className="agent-form-group">
              <label className="agent-label">Notes <span className="agent-optional">(optional)</span></label>
              <textarea
                className="agent-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any remarks…"
                rows={3}
              />
            </div>

            {submitError && <p className="agent-error">{submitError}</p>}

            <p className="agent-gps-notice">
              📍 We'll capture your GPS location to verify you're on site.
            </p>

            <button type="submit" className="agent-btn">
              Log My Presence
            </button>

            <button type="button" className="agent-btn-ghost" onClick={() => setStep(STEPS.SELECT)}>
              ← Back
            </button>
          </form>
        )}

        {/* Locating */}
        {step === STEPS.LOCATING && (
          <div className="agent-locating">
            <div className="agent-spinner" />
            <p className="agent-locating-text">Capturing GPS…</p>
            <p className="agent-locating-sub">Please allow location access if prompted.</p>
          </div>
        )}

        {/* Result */}
        {step === STEPS.RESULT && result && (
          <div className="agent-result">
            <div className={`agent-result-icon${result.withinFence === true ? ' agent-result-icon--ok' : result.withinFence === false ? ' agent-result-icon--warn' : ' agent-result-icon--neutral'}`}>
              {result.withinFence === true ? '✓' : result.withinFence === false ? '!' : '✓'}
            </div>

            <h2 className="agent-result-title">Presence Logged</h2>

            <div className="agent-result-detail">
              <div className="agent-result-row">
                <span className="agent-result-label">Agent</span>
                <span className="agent-result-value">{result.agentName}</span>
              </div>
              <div className="agent-result-row">
                <span className="agent-result-label">Site</span>
                <span className="agent-result-value">{result.layoutName}</span>
              </div>
              {result.distanceM !== null && (
                <div className="agent-result-row">
                  <span className="agent-result-label">Distance</span>
                  <span className="agent-result-value">{result.distanceM < 1000 ? `${result.distanceM}m` : `${(result.distanceM / 1000).toFixed(1)}km`}</span>
                </div>
              )}
            </div>

            {result.withinFence === true && (
              <div className="agent-fence-badge agent-fence-badge--in">
                ✓ Within site boundary
              </div>
            )}
            {result.withinFence === false && (
              <div className="agent-fence-badge agent-fence-badge--out">
                ⚠ Outside site boundary
              </div>
            )}
            {result.withinFence === null && (
              <div className="agent-fence-badge agent-fence-badge--neutral">
                {gpsError ? 'Location unavailable — logged without GPS' : 'Geofence not configured for this site'}
              </div>
            )}

            <button className="agent-btn" style={{ marginTop: '2.4rem' }} onClick={reset}>
              Log Another Visit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
