import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getRoleBadge(role) {
  if (role === 'owner') {
    return { label: 'Owner', cls: 'dash-update-role--owner' }
  }
  if (role === 'manager') {
    return { label: 'Manager', cls: 'dash-update-role--staff' }
  }
  return { label: 'Admin', cls: 'dash-update-role--staff' }
}

// ─── Main Updates Page ────────────────────────────────────────────────────────
export default function UpdatesPage() {
  const { profile } = useAuth()
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  const [menuOpenId, setMenuOpenId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!menuOpenId) return
    function handleClose() { setMenuOpenId(null) }
    document.addEventListener('click', handleClose)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      document.removeEventListener('click', handleClose)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [menuOpenId])

  function openMenu(e, id) {
    e.stopPropagation()
    if (menuOpenId === id) { setMenuOpenId(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    })
    setMenuOpenId(id)
  }

  async function handleEditSave(id) {
    if (!editText.trim()) return
    setSaving(true)
    try {
      await runSupabaseMutation(
        () => supabase.from('staff_updates').update({ message: editText.trim() }).eq('id', id),
        { label: 'Edit staff update' }
      )
      setUpdates(prev => prev.map(u => u.id === id ? { ...u, message: editText.trim() } : u))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      await runSupabaseMutation(
        () => supabase.from('staff_updates').delete().eq('id', id),
        { label: 'Delete staff update' }
      )
      setUpdates(prev => prev.filter(u => u.id !== id))
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await runSupabaseRequest(
        () =>
          supabase
            .from('staff_updates')
            .select('id, author_name, author_role, message, created_at')
            .order('created_at', { ascending: false })
            .limit(100),
        { label: 'Load staff updates' }
      )
      setUpdates(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    setError(null)

    try {
      const payload = {
        author_name: profile?.full_name ?? 'Unknown',
        author_role: profile?.role ?? 'admin',
        message: message.trim(),
      }

      await runSupabaseMutation(
        () => supabase.from('staff_updates').insert(payload),
        { label: 'Post staff update' }
      )

      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function handleTextareaInput(e) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const authorName = profile?.full_name ?? 'Staff'
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="dash-page dash-updates-page">
      <div className="dash-page-header">
        <h1 className="dash-page-title">Updates</h1>
        <span className="dash-page-count">
          {updates.length} remark{updates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <p className="dash-error">{error}</p>}

      {/* ── Compose area ── */}
      <div className="dash-glass dash-updates-compose">
        <div className="dash-updates-compose-header">
          <div className="dash-updates-compose-avatar">
            {initials}
          </div>
          <div className="dash-updates-compose-meta">
            <span className="dash-updates-compose-name">{authorName}</span>
            <span className={`dash-update-role-badge ${getRoleBadge(profile?.role).cls}`}>
              {getRoleBadge(profile?.role).label}
            </span>
          </div>
        </div>
        <form className="dash-updates-compose-form" onSubmit={handleSend}>
          <textarea
            ref={textareaRef}
            className="dash-updates-compose-input"
            placeholder="Write an update or remark…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleTextareaInput}
            rows={2}
          />
          <div className="dash-updates-compose-actions">
            <span className="dash-updates-compose-hint">
              Visible to all staff &amp; owner
            </span>
            <button
              type="submit"
              className="dash-btn dash-btn--primary dash-btn--sm"
              disabled={sending || !message.trim()}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.5rem', verticalAlign: 'middle', marginRight: '0.4rem' }}
              >
                send
              </span>
              {sending ? 'Sending…' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="dash-loading-spinner" style={{ marginTop: '4rem' }} />
      ) : updates.length === 0 ? (
        <div className="dash-updates-empty">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '4.8rem', color: '#c7c7cc', marginBottom: '1.2rem' }}
          >
            forum
          </span>
          <p>No updates yet. Be the first to post!</p>
        </div>
      ) : (
        <div className="dash-updates-feed">
          {updates.map((u) => {
            const badge = getRoleBadge(u.author_role)
            const uInitials = u.author_name
              ? u.author_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '?'
            const isEditing = editingId === u.id
            const isConfirmingDelete = confirmDeleteId === u.id

            return (
              <div key={u.id} className="dash-glass dash-update-card">
                <div className="dash-update-card-header">
                  <div
                    className={`dash-update-avatar ${
                      u.author_role === 'owner'
                        ? 'dash-update-avatar--owner'
                        : 'dash-update-avatar--staff'
                    }`}
                  >
                    {uInitials}
                  </div>
                  <div className="dash-update-author-info">
                    <span className="dash-update-author-name">{u.author_name}</span>
                    <span className={`dash-update-role-badge ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="dash-update-time">{timeAgo(u.created_at)}</span>
                  <div className="dash-update-menu">
                    <button
                      className="dash-update-menu-btn"
                      onClick={(e) => openMenu(e, u.id)}
                      aria-label="More options"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="dash-update-edit">
                    <textarea
                      className="dash-updates-compose-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="dash-update-edit-actions">
                      <button className="dash-btn dash-btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                      <button
                        className="dash-btn dash-btn--primary dash-btn--sm"
                        onClick={() => handleEditSave(u.id)}
                        disabled={saving || !editText.trim()}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : isConfirmingDelete ? (
                  <div className="dash-update-delete-confirm">
                    <p>Delete this update?</p>
                    <div className="dash-update-edit-actions">
                      <button className="dash-btn dash-btn--sm" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</button>
                      <button
                        className="dash-btn dash-btn--danger dash-btn--sm"
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="dash-update-message">{u.message}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dropdown rendered at fixed position to escape stacking contexts ── */}
      {menuOpenId && (
        <div
          className="dash-update-menu-dropdown"
          style={{ top: menuPos.top, right: menuPos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="dash-update-menu-item"
            onClick={() => {
              const u = updates.find(x => x.id === menuOpenId)
              if (u) { setEditingId(u.id); setEditText(u.message) }
              setMenuOpenId(null)
            }}
          >
            <span className="material-symbols-outlined">edit</span>
            Edit
          </button>
          <button
            className="dash-update-menu-item dash-update-menu-item--danger"
            onClick={() => {
              setConfirmDeleteId(menuOpenId)
              setMenuOpenId(null)
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            Delete
          </button>
        </div>
      )}

    </div>
  )
}
