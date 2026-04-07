import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { runSupabaseRequest } from '../lib/supabaseRequest'

const CATEGORY_INFO = {
  legal:     { label: 'Legal', icon: '⚖️', color: '#046ebc', bg: '#f0f7ff', border: '#cce3f8' },
  agreement: { label: 'Agreement', icon: '📝', color: '#c77700', bg: '#fff8e1', border: '#ffe08a' },
  tax:       { label: 'Tax', icon: '🧾', color: '#636366', bg: '#f5f5f7', border: '#e5e5ea' },
  receipt:   { label: 'Receipt', icon: '🧾', color: '#1a7f3c', bg: '#f0fff4', border: '#b7f5c4' },
  other:     { label: 'Other', icon: '📄', color: '#8e8e93', bg: '#f5f5f7', border: '#e5e5ea' },
}

export default function BuyerDocumentsPage() {
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const { data: planData } = await runSupabaseRequest(
          () => supabase
            .from('payment_plans')
            .select('plot_id')
            .eq('buyer_user_id', user.id)
            .maybeSingle(),
          { label: 'Load buyer document plan' }
        )

        if (cancelled || !planData) return

        const { data: docData } = await runSupabaseRequest(
          () => supabase
            .from('documents')
            .select('id, name, category, file_url, google_doc_url, is_buyer_visible, created_at')
            .eq('plot_id', planData.plot_id)
            .eq('is_buyer_visible', true)
            .order('created_at', { ascending: false }),
          { label: 'Load buyer documents' }
        )

        if (cancelled) return
        setDocs(docData ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return (
      <div className="buyer-page">
        <div className="buyer-loading-inline"><div className="buyer-spinner" /> Loading…</div>
      </div>
    )
  }

  if (error) return <div className="buyer-page"><div className="buyer-error">{error}</div></div>

  return (
    <div className="buyer-page">
      <div className="buyer-page-header">
        <h1 className="buyer-page-title">Documents</h1>
        <p className="buyer-page-subtitle">Your sale agreements, receipts, and legal documents</p>
      </div>

      {docs.length === 0 ? (
        <div className="buyer-empty">
          <div className="buyer-empty-icon">📁</div>
          <p>No documents shared yet. Check back after your booking is confirmed.</p>
        </div>
      ) : (
        <div className="buyer-card">
          <div className="buyer-doc-list">
            {docs.map(doc => {
              const catInfo = CATEGORY_INFO[doc.category] ?? CATEGORY_INFO.other
              return (
                <div key={doc.id} className="buyer-doc-item">
                  <div
                    className="buyer-doc-icon"
                    style={{ background: catInfo.bg, color: catInfo.color }}
                  >
                    {catInfo.icon}
                  </div>
                  <div className="buyer-doc-info">
                    <div className="buyer-doc-name">{doc.name}</div>
                    <div className="buyer-doc-meta">
                      <span
                        className="buyer-badge"
                        style={{
                          background: catInfo.bg,
                          color: catInfo.color,
                          borderColor: catInfo.border,
                          fontSize: '1.1rem',
                          padding: '0.15rem 0.7rem',
                        }}
                      >
                        {catInfo.label}
                      </span>
                      <span style={{ marginLeft: '0.8rem' }}>
                        Added {new Date(doc.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <a
                    href={doc.google_doc_url ?? doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="buyer-doc-download"
                  >
                    Open ↗
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
