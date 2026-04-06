import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

const EMPTY_FORM = {
  name: '',
  slug: '',
  cityId: '',
  description: '',
  address: '',
  isPublished: false,
  legalDocUrl: '',
  latitude: '',
  longitude: '',
  geofenceRadius: '200',
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function mapLayout(row) {
  return {
    id: row.id,
    cityId: row.city_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    layoutImageUrl: row.layout_image_url ?? null,
    cardImageUrl: row.card_image_url ?? null,
    address: row.address ?? '',
    isPublished: row.is_published,
    legalDocUrl: row.legal_doc_url ?? '',
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    geofenceRadius: row.geofence_radius_m ?? '200',
  }
}

export default function LayoutManager() {
  const navigate = useNavigate()
  const [layouts, setLayouts] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [uploadingFor, setUploadingFor] = useState(null)
  const [uploadingCardFor, setUploadingCardFor] = useState(null)

  // Gallery state (edit modal only)
  const [galleryItems, setGalleryItems] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaDeleting, setMediaDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [citiesRes, layoutsRes] = await Promise.all([
        runSupabaseRequest(() => supabase.from('cities').select('id, name, state, sort_order').order('sort_order'), { label: 'Load cities for layout manager' }),
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, city_id, name, slug, description, layout_image_url, card_image_url, address, is_published, legal_doc_url, latitude, longitude, geofence_radius_m').order('name'),
          { label: 'Load layouts for manager' }
        ),
      ])
      setCities(citiesRes.data)
      setLayouts(layoutsRes.data.map(mapLayout))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Load gallery items when editing a layout
  useEffect(() => {
    if (!editingId) { setGalleryItems([]); return undefined }

    let cancelled = false
    setGalleryLoading(true)

    async function loadGalleryItems() {
      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('layout_media')
            .select('id, layout_id, type, url, thumbnail_url, caption, sort_order')
            .eq('layout_id', editingId)
            .order('sort_order'),
          { label: 'Load layout gallery items' }
        )

        if (!cancelled) setGalleryItems(data || [])
      } catch (err) {
        if (!cancelled) setFormError(err.message)
      } finally {
        if (!cancelled) setGalleryLoading(false)
      }
    }

    loadGalleryItems()

    return () => {
      cancelled = true
    }
  }, [editingId])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(layout) {
    setEditingId(layout.id)
    setForm({
      name: layout.name,
      slug: layout.slug,
      cityId: layout.cityId,
      description: layout.description,
      address: layout.address,
      isPublished: layout.isPublished,
      legalDocUrl: layout.legalDocUrl,
      latitude: layout.latitude ?? '',
      longitude: layout.longitude ?? '',
      geofenceRadius: layout.geofenceRadius ?? '200',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function handleNameChange(e) {
    const name = e.target.value
    setForm(f => ({
      ...f,
      name,
      slug: editingId ? f.slug : slugify(name),
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.cityId) {
      setFormError('Please select a city.')
      return
    }
    setSaving(true)
    setFormError(null)

    const payload = {
      city_id: form.cityId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      is_published: form.isPublished,
      legal_doc_url: form.legalDocUrl.trim() || null,
      latitude: form.latitude !== '' ? Number(form.latitude) : null,
      longitude: form.longitude !== '' ? Number(form.longitude) : null,
      geofence_radius_m: form.geofenceRadius !== '' ? Number(form.geofenceRadius) : 200,
    }

    try {
      if (editingId) {
        await runSupabaseMutation(
          () => supabase.from('site_layouts').update(payload).eq('id', editingId),
          { label: 'Update layout' }
        )
      } else {
        await runSupabaseMutation(
          () => supabase.from('site_layouts').insert(payload),
          { label: 'Create layout' }
        )
      }
    } catch (err) {
      setFormError(err.message)
      setSaving(false)
      return
    }

    await load()
    closeForm()
    setSaving(false)
  }

  async function handleMediaUpload(file, type) {
    if (!file || !editingId) return
    setMediaUploading(true)
    const ext = file.name.split('.').pop()
    const uid = crypto.randomUUID()
    const path = `gallery/${editingId}/${uid}.${ext}`

    try {
      await runSupabaseMutation(
        () => supabase.storage
          .from('layout-images')
          .upload(path, file, { upsert: false }),
        { label: 'Upload layout media' }
      )

      const { data: urlData } = supabase.storage.from('layout-images').getPublicUrl(path)

      const { data: newItem } = await runSupabaseMutation(
        () => supabase
          .from('layout_media')
          .insert({ layout_id: editingId, type, url: urlData.publicUrl, sort_order: galleryItems.length })
          .select('id, layout_id, type, url, thumbnail_url, caption, sort_order')
          .single(),
        { label: 'Save layout media record' }
      )

      if (newItem) setGalleryItems(prev => [...prev, newItem])
    } catch (err) {
      setFormError(`Upload failed: ${err.message}`)
    } finally {
      setMediaUploading(false)
    }
  }

  async function handleMediaDelete(item) {
    setMediaDeleting(item.id)
    try {
      const url = new URL(item.url)
      const storagePath = url.pathname.split('/object/public/layout-images/')[1]
      if (storagePath) {
        await runSupabaseMutation(
          () => supabase.storage.from('layout-images').remove([storagePath]),
          { label: 'Delete layout media file' }
        )
      }
    } catch (_) { /* ignore storage error, still remove from DB */ }
    try {
      await runSupabaseMutation(
        () => supabase.from('layout_media').delete().eq('id', item.id),
        { label: 'Delete layout media record' }
      )
      setGalleryItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err) {
      setFormError(err.message)
    } finally {
      setMediaDeleting(null)
    }
  }

  async function handleTogglePublish(layout) {
    try {
      await runSupabaseMutation(
        () => supabase
          .from('site_layouts')
          .update({ is_published: !layout.isPublished })
          .eq('id', layout.id),
        { label: 'Toggle layout publish state' }
      )
      setLayouts(prev =>
        prev.map(l => l.id === layout.id ? { ...l, isPublished: !l.isPublished } : l)
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleImageUpload(layoutId, file) {
    if (!file) return
    setUploadingFor(layoutId)
    const ext = file.name.split('.').pop()
    const path = `${layoutId}/site-plan.${ext}`

    try {
      await runSupabaseMutation(
        () => supabase.storage
          .from('layout-images')
          .upload(path, file, { upsert: true }),
        { label: 'Upload layout image' }
      )

      const { data: urlData } = supabase.storage
        .from('layout-images')
        .getPublicUrl(path)

      await runSupabaseMutation(
        () => supabase
          .from('site_layouts')
          .update({ layout_image_url: urlData.publicUrl })
          .eq('id', layoutId),
        { label: 'Save layout image URL' }
      )

      setLayouts(prev =>
        prev.map(l => l.id === layoutId ? { ...l, layoutImageUrl: urlData.publicUrl } : l)
      )
    } catch (err) {
      setError(`Image upload failed: ${err.message}`)
    } finally {
      setUploadingFor(null)
    }
  }

  async function handleCardImageUpload(layoutId, file) {
    if (!file) return
    setUploadingCardFor(layoutId)
    const ext = file.name.split('.').pop()
    const path = `${layoutId}/card.${ext}`

    try {
      await runSupabaseMutation(
        () => supabase.storage
          .from('layout-images')
          .upload(path, file, { upsert: true }),
        { label: 'Upload layout card image' }
      )

      const { data: urlData } = supabase.storage
        .from('layout-images')
        .getPublicUrl(path)

      await runSupabaseMutation(
        () => supabase
          .from('site_layouts')
          .update({ card_image_url: urlData.publicUrl })
          .eq('id', layoutId),
        { label: 'Save card image URL' }
      )

      setLayouts(prev =>
        prev.map(l => l.id === layoutId ? { ...l, cardImageUrl: urlData.publicUrl } : l)
      )
    } catch (err) {
      setError(`Card image upload failed: ${err.message}`)
    } finally {
      setUploadingCardFor(null)
    }
  }

  const cityById = Object.fromEntries(cities.map(c => [c.id, c]))

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading-inline">Loading layouts…</div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Layouts</h1>
        <button className="dash-btn dash-btn--primary" onClick={openCreate}>
          + New Layout
        </button>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {layouts.length === 0 ? (
        <p className="dash-empty">No layouts yet. Create one to get started.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Status</th>
                <th>Card Image</th>
                <th>Site Plan</th>
                <th>Overlay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map(layout => (
                <tr
                  key={layout.id}
                  className="dash-table-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/plots?layout=${layout.id}`)}
                >
                  <td>
                    <div className="dash-table-name">{layout.name}</div>
                  </td>
                  <td>{cityById[layout.cityId]?.name ?? '—'}</td>
                  <td>
                    <button
                      className={`dash-badge dash-badge--clickable ${layout.isPublished ? 'dash-badge--published' : 'dash-badge--draft'}`}
                      onClick={e => { e.stopPropagation(); handleTogglePublish(layout) }}
                      title="Click to toggle"
                    >
                      {layout.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {layout.cardImageUrl ? (
                      <span className="dash-badge dash-badge--ok">Uploaded</span>
                    ) : (
                      <label className="dash-upload-label">
                        {uploadingCardFor === layout.id ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={e => handleCardImageUpload(layout.id, e.target.files[0])}
                          disabled={uploadingCardFor !== null}
                        />
                      </label>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {layout.layoutImageUrl ? (
                      <span className="dash-badge dash-badge--ok">Uploaded</span>
                    ) : (
                      <label className="dash-upload-label">
                        {uploadingFor === layout.id ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={e => handleImageUpload(layout.id, e.target.files[0])}
                          disabled={uploadingFor !== null}
                        />
                      </label>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <Link
                      to={`/admin/layouts/${layout.id}/overlay`}
                      className="dash-btn dash-btn--sm"
                    >
                      Edit Overlay
                    </Link>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="dash-table-actions">
                      <button
                        className="dash-btn dash-btn--sm"
                        onClick={() => navigate(`/admin/plots?layout=${layout.id}`)}
                      >
                        View Plots →
                      </button>
                      <button
                        className="dash-btn dash-btn--sm"
                        onClick={() => openEdit(layout)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="dash-modal">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">
                {editingId ? 'Edit Layout' : 'New Layout'}
              </h2>
              <button className="dash-modal-close" onClick={closeForm} aria-label="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="dash-form">
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label" htmlFor="lm-name">Name *</label>
                  <input
                    id="lm-name"
                    type="text"
                    className="dash-form-input"
                    value={form.name}
                    onChange={handleNameChange}
                    required
                    placeholder="Hunsur Icon City"
                  />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label" htmlFor="lm-slug">Slug *</label>
                  <input
                    id="lm-slug"
                    type="text"
                    className="dash-form-input"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    required
                    placeholder="hunsur-icon-city"
                  />
                </div>
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="lm-city">City *</label>
                <select
                  id="lm-city"
                  className="dash-form-select"
                  value={form.cityId}
                  onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))}
                  required
                >
                  <option value="">Select city…</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="lm-address">Address</label>
                <input
                  id="lm-address"
                  type="text"
                  className="dash-form-input"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Mysore Ring Road, Mysore"
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="lm-desc">Description</label>
                <textarea
                  id="lm-desc"
                  className="dash-form-textarea"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Premium gated community with 100% Vastu-compliant plots…"
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="lm-legal">Legal Doc URL</label>
                <input
                  id="lm-legal"
                  type="url"
                  className="dash-form-input"
                  value={form.legalDocUrl}
                  onChange={e => setForm(f => ({ ...f, legalDocUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>

              {/* GPS + Geofence (for agent check-in) */}
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label className="dash-form-label" htmlFor="lm-lat">Latitude</label>
                  <input
                    id="lm-lat"
                    type="number"
                    step="any"
                    className="dash-form-input"
                    value={form.latitude}
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    placeholder="e.g. 12.2958"
                  />
                </div>
                <div className="dash-form-group">
                  <label className="dash-form-label" htmlFor="lm-lng">Longitude</label>
                  <input
                    id="lm-lng"
                    type="number"
                    step="any"
                    className="dash-form-input"
                    value={form.longitude}
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    placeholder="e.g. 76.6394"
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="lm-geofence">Geofence Radius (metres)</label>
                <input
                  id="lm-geofence"
                  type="number"
                  min="50"
                  max="5000"
                  className="dash-form-input"
                  value={form.geofenceRadius}
                  onChange={e => setForm(f => ({ ...f, geofenceRadius: e.target.value }))}
                  placeholder="200"
                />
                <span className="dash-form-hint">Radius around the site centre used for agent GPS check-in verification.</span>
              </div>

              <div className="dash-form-check">
                <input
                  id="lm-published"
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                />
                <label htmlFor="lm-published">Published (visible on public site)</label>
              </div>

              {/* Gallery — only visible when editing an existing layout */}
              {editingId && (
                <div className="dash-gallery-section">
                  <div className="dash-gallery-section-header">
                    <span className="dash-form-label" style={{ margin: 0 }}>Gallery</span>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                      <label className={`dash-btn dash-btn--sm${mediaUploading ? ' dash-btn--disabled' : ''}`}>
                        {mediaUploading ? 'Uploading…' : '+ Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={mediaUploading}
                          onChange={e => { handleMediaUpload(e.target.files[0], 'photo'); e.target.value = '' }}
                        />
                      </label>
                      <label className={`dash-btn dash-btn--sm${mediaUploading ? ' dash-btn--disabled' : ''}`}>
                        {mediaUploading ? 'Uploading…' : '+ Video'}
                        <input
                          type="file"
                          accept="video/*"
                          hidden
                          disabled={mediaUploading}
                          onChange={e => { handleMediaUpload(e.target.files[0], 'video'); e.target.value = '' }}
                        />
                      </label>
                    </div>
                  </div>

                  {galleryLoading ? (
                    <p className="dash-gallery-empty">Loading…</p>
                  ) : galleryItems.length === 0 ? (
                    <p className="dash-gallery-empty">No media yet. Upload photos or videos above.</p>
                  ) : (
                    <div className="dash-gallery-grid">
                      {galleryItems.map(item => (
                        <div key={item.id} className="dash-gallery-item">
                          {item.type === 'video' ? (
                            <video className="dash-gallery-thumb" src={item.url} preload="none" />
                          ) : (
                            <img
                              className="dash-gallery-thumb"
                              src={item.thumbnail_url || item.url}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          <div className="dash-gallery-item-footer">
                            <span className={`dash-badge ${item.type === 'video' ? 'dash-badge--draft' : 'dash-badge--ok'}`}>
                              {item.type}
                            </span>
                            <button
                              type="button"
                              className="dash-gallery-delete-btn"
                              onClick={() => handleMediaDelete(item)}
                              disabled={mediaDeleting === item.id}
                              aria-label="Delete"
                            >
                              {mediaDeleting === item.id ? '…' : '✕'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formError && <p className="dash-error">{formError}</p>}

              <div className="dash-form-actions">
                <button type="button" className="dash-btn" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Layout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
