import { useEffect, useRef } from 'react'

// Small accessible wrapper around the dashboard's existing modal styles.
export default function Modal({ title, onClose, children }) {
  const boxRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    boxRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [onClose])

  return (
    <div className="dash-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="dash-modal ml-modal"
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
        <div className="ml-modal-body">{children}</div>
      </div>
    </div>
  )
}
