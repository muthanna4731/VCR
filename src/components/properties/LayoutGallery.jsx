import { useState, useEffect, useCallback } from 'react'

function PlayIcon() {
  return (
    <svg className="gal-play-icon" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.55)" />
      <polygon points="9.5,7.5 18,12 9.5,16.5" fill="#fff" />
    </svg>
  )
}

function Lightbox({ items, index, onClose, onNav }) {
  const item = items[index]

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') onNav(1)
    if (e.key === 'ArrowLeft') onNav(-1)
  }, [onClose, onNav])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  return (
    <div className="gal-lightbox" onClick={onClose}>
      <button className="gal-lightbox-close" onClick={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {items.length > 1 && (
        <>
          <button
            className="gal-lightbox-nav gal-lightbox-prev"
            onClick={(e) => { e.stopPropagation(); onNav(-1) }}
            aria-label="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="gal-lightbox-nav gal-lightbox-next"
            onClick={(e) => { e.stopPropagation(); onNav(1) }}
            aria-label="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <div className="gal-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video
            className="gal-lightbox-video"
            src={item.url}
            poster={item.thumbnailUrl || undefined}
            controls
            autoPlay
            preload="metadata"
          />
        ) : (
          <img
            className="gal-lightbox-img"
            src={item.url}
            alt={item.caption || ''}
            decoding="async"
          />
        )}
        {item.caption && (
          <div className="gal-lightbox-caption">{item.caption}</div>
        )}
      </div>

      <div className="gal-lightbox-counter">
        {index + 1} / {items.length}
      </div>
    </div>
  )
}

export default function LayoutGallery({ media, loading }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const handleNav = useCallback((dir) => {
    setLightboxIndex(prev => (prev + dir + media.length) % media.length)
  }, [media.length])

  const handleClose = useCallback(() => setLightboxIndex(null), [])

  if (loading) {
    return (
      <div className="gal-section">
        <h2 className="gal-section-title">Gallery</h2>
        <div className="gal-skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="gal-skeleton-item" />
          ))}
        </div>
      </div>
    )
  }

  if (!media.length) return null

  const photos = media.filter(m => m.type === 'photo')
  const videos = media.filter(m => m.type === 'video')

  return (
    <>
      <div className="gal-section">
        <h2 className="gal-section-title">Gallery</h2>

        {photos.length > 0 && (
          <>
            {videos.length > 0 && (
              <div className="gal-group-label">Photos</div>
            )}
            <div className="gal-grid">
              {photos.map((item) => {
                const globalIdx = media.indexOf(item)
                const thumb = item.thumbnailUrl || item.url
                return (
                  <button
                    key={item.id}
                    className="gal-item"
                    onClick={() => setLightboxIndex(globalIdx)}
                    aria-label={item.caption || 'View photo'}
                  >
                    <img
                      src={thumb}
                      alt={item.caption || ''}
                      loading="lazy"
                      decoding="async"
                      className="gal-thumb"
                    />
                    {item.caption && (
                      <div className="gal-item-caption">{item.caption}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {videos.length > 0 && (
          <>
            {photos.length > 0 && (
              <div className="gal-group-label" style={{ marginTop: '2.4rem' }}>Videos</div>
            )}
            <div className="gal-grid">
              {videos.map((item) => {
                const globalIdx = media.indexOf(item)
                const thumb = item.thumbnailUrl
                return (
                  <button
                    key={item.id}
                    className="gal-item gal-item--video"
                    onClick={() => setLightboxIndex(globalIdx)}
                    aria-label={item.caption || 'Play video'}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.caption || ''}
                        loading="lazy"
                        decoding="async"
                        className="gal-thumb"
                      />
                    ) : (
                      <div className="gal-thumb gal-thumb--placeholder" />
                    )}
                    <PlayIcon />
                    {item.caption && (
                      <div className="gal-item-caption">{item.caption}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={media}
          index={lightboxIndex}
          onClose={handleClose}
          onNav={handleNav}
        />
      )}
    </>
  )
}
