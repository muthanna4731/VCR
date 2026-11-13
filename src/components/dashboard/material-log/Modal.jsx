import { useEffect, useRef } from 'react'

// Small accessible wrapper around the dashboard's existing modal styles.
export default function Modal({ title, onClose, children }) {
  const boxRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    boxRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      // Keep Tab inside the dialog.
      const box = boxRef.current
      if (!box) return
      const items = [...box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); box.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === box)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      else if (!box.contains(active)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [onClose])

  return (
    <div className="dash-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="dash-modal dash-ml-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={boxRef}
      >
        <div className="dash-modal-header">
          <h2 className="dash-modal-title">{title}</h2>
          <button type="button" className="dash-modal-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="dash-ml-modal-body">{children}</div>
      </div>
    </div>
  )
}
