import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const CATEGORIES = [
  { value: 'legal',     label: 'Legal' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'tax',       label: 'Tax' },
  { value: 'receipt',   label: 'Receipt' },
  { value: 'other',     label: 'Other' },
]

const CATEGORY_COLORS = {
  legal:     { color: '#046ebc', bg: '#f0f7ff', border: '#cce3f8' },
  agreement: { color: '#c77700', bg: '#fff8e1', border: '#ffe08a' },
  tax:       { color: '#636366', bg: '#f5f5f7', border: '#e5e5ea' },
  receipt:   { color: '#34c759', bg: '#f0fff4', border: '#b7f5c4' },
  other:     { color: '#8e8e93', bg: '#f5f5f7', border: '#e5e5ea' },
}

const EMPTY_FORM = {
  name: '',
  category: 'other',
  layout_id: '',
  plot_id: '',
  is_buyer_visible: false,
}

function UploadModal({ layouts, plots, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const filteredPlots = form.layout_id
    ? plots.filter(p => p.layout_id === form.layout_id)
    : plots

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    // reset plot when layout changes
    if (name === 'layout_id') setForm(f => ({ ...f, layout_id: value, plot_id: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    if (!form.name.trim()) { setError('Document name is required.'); return }
    setUploading(true); setError(null)

    const ext = file.name.split('.').pop()
    const path = `${form.category}/${Date.now()}_${form.name.trim().replace(/\s+/g, '-')}.${ext}`

    try {
      await runSupabaseMutation(
        () => supabase.storage.from('documents').upload(path, file, { upsert: false }),
        { label: 'Upload document file' }
      )

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      const file_url = urlData.publicUrl

      await runSupabaseMutation(
        () => supabase.from('documents').insert({
          name:             form.name.trim(),
          category:         form.category,
          layout_id:        form.layout_id || null,
          plot_id:          form.plot_id || null,
          file_url,
          is_buyer_visible: form.is_buyer_visible,
        }),
        { label: 'Save document metadata' }
      )

      onSave()
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true" aria-label="Upload Document">
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">Upload Document</h2>
          <button className="dash-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="dash-form" onSubmit={handleSubmit}>
          {error && <p className="dash-error">{error}</p>}

          <div className="dash-form-group">
            <label className="dash-form-label">File *</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="dash-form-input"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <span className="dash-form-hint">PDF, images, Word, or Excel files accepted</span>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Document Name *</label>
              <input className="dash-form-input" name="name" value={form.name}
                onChange={handleChange} placeholder="e.g. Sale Agreement — Plot 12A" required />
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Category</label>
              <select className="dash-form-select" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label className="dash-form-label">Link to Layout</label>
              <select className="dash-form-select" name="layout_id" value={form.layout_id} onChange={handleChange}>
                <option value="">None</option>
                {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="dash-form-group">
              <label className="dash-form-label">Link to Plot</label>
              <select className="dash-form-select" name="plot_id" value={form.plot_id}
                onChange={e => setForm(f => ({ ...f, plot_id: e.target.value }))}
                disabled={filteredPlots.length === 0}>
                <option value="">None</option>
                {filteredPlots.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.plot_number} {p.layout_name ? `— ${p.layout_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="dash-form-check">
            <input type="checkbox" name="is_buyer_visible" checked={form.is_buyer_visible} onChange={handleChange} />
            Visible to buyer in buyer portal (Phase 7)
          </label>

          <div className="dash-form-actions">
            <button type="button" className="dash-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn--primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocumentVault() {
  const [docs, setDocs] = useState([])
  const [layouts, setLayouts] = useState([])
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ category: '', layout: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [docsRes, layoutsRes, plotsRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase
            .from('documents')
            .select('id, layout_id, plot_id, name, category, file_url, is_buyer_visible, created_at, site_layouts(name), plots(plot_number, layout_id)')
            .order('created_at', { ascending: false }),
          { label: 'Load documents' }
        ),
        runSupabaseRequest(() => supabase.from('site_layouts').select('id, name').order('name'), { label: 'Load document layouts' }),
        runSupabaseRequest(() => supabase.from('plots').select('id, plot_number, layout_id, site_layouts(name)').order('plot_number'), { label: 'Load document plots' }),
      ])
      setDocs(docsRes.data)
      setLayouts(layoutsRes.data ?? [])
      setPlots((plotsRes.data ?? []).map(p => ({ ...p, layout_name: p.site_layouts?.name })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load] )

  async function deleteDoc(id) {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await runSupabaseMutation(() => supabase.from('documents').delete().eq('id', id), { label: 'Delete document' })
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleBuyerVisible(doc) {
    setTogglingId(doc.id)
    const newVal = !doc.is_buyer_visible
    try {
      await runSupabaseMutation(
        () => supabase.from('documents').update({ is_buyer_visible: newVal }).eq('id', doc.id),
        { label: 'Toggle buyer visibility' }
      )
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_buyer_visible: newVal } : d))
    } catch (err) {
      setError(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = docs.filter(d => {
    if (filters.category && d.category !== filters.category) return false
    if (filters.layout && d.layout_id !== filters.layout) return false
    return true
  })

  if (loading) return <div className="dash-page"><div className="dash-loading-inline">Loading documents…</div></div>

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Documents</h1>
        <span className="dash-page-count">{filtered.length} of {docs.length}</span>
        <button className="dash-btn dash-btn--primary" onClick={() => setShowModal(true)}>
          + Upload Document
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-filter-bar">
        <select className="dash-filter-select" value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="dash-filter-select" value={filters.layout}
          onChange={e => setFilters(f => ({ ...f, layout: e.target.value }))}>
          <option value="">All Layouts</option>
          {layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {(filters.category || filters.layout) && (
          <button className="dash-btn dash-btn--ghost dash-btn--sm"
            onClick={() => setFilters({ category: '', layout: '' })}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="dash-empty">No documents yet. Upload your first document to get started.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Linked To</th>
                <th>Buyer Visible</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const catCfg = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.other
                const linkedLayout = doc.site_layouts?.name
                const linkedPlot = doc.plots?.plot_number
                return (
                  <tr key={doc.id} className="dash-table-row">
                    <td>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dash-doc-name-link"
                      >
                        {doc.name} ↗
                      </a>
                    </td>
                    <td>
                      <span
                        className="dash-badge"
                        style={{ color: catCfg.color, background: catCfg.bg, border: `1px solid ${catCfg.border}` }}
                      >
                        {CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '1.3rem' }}>
                      {linkedLayout && <div>{linkedLayout}</div>}
                      {linkedPlot && <div className="dash-table-sub">Plot #{linkedPlot}</div>}
                      {!linkedLayout && !linkedPlot && <span style={{ color: '#aeaeb2' }}>—</span>}
                    </td>
                    <td>
                      <button
                        className={`dash-doc-toggle${doc.is_buyer_visible ? ' dash-doc-toggle--on' : ''}`}
                        onClick={() => toggleBuyerVisible(doc)}
                        disabled={togglingId === doc.id}
                        title={doc.is_buyer_visible ? 'Visible to buyer — click to hide' : 'Hidden from buyer — click to show'}
                      >
                        <span className="dash-doc-toggle-knob" />
                      </button>
                    </td>
                    <td style={{ fontSize: '1.3rem', color: '#636366', whiteSpace: 'nowrap' }}>
                      {new Date(doc.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div className="dash-table-actions">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dash-btn dash-btn--sm"
                        >
                          View
                        </a>
                        <button
                          className="dash-btn dash-btn--sm dash-btn--danger"
                          onClick={() => deleteDoc(doc.id)}
                          disabled={deletingId === doc.id}
                        >
                          {deletingId === doc.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <UploadModal
          layouts={layouts}
          plots={plots}
          onSave={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
