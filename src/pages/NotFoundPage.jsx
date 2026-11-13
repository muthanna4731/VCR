import { useEffect } from 'react'
import { Link } from 'react-router'
import '../css/properties.css'

/** Catch-all for unknown public URLs — previously these rendered a blank page. */
export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found | VCR Builders and Developers'
    let robots = document.head.querySelector('meta[name="robots"]')
    const added = !robots
    if (added) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    const previous = robots.getAttribute('content')
    robots.setAttribute('content', 'noindex')
    return () => {
      if (added) robots.remove()
      else robots.setAttribute('content', previous ?? '')
    }
  }, [])

  return (
    <div className="contact-page not-found-page">
      <div className="container-container">
        <h1 className="contact-page-title">Page not found</h1>
        <p className="contact-page-subtitle">
          This page doesn't exist or has moved. Our layouts, prices and site maps are all on the properties page.
        </p>
        <div className="not-found-actions">
          <Link to="/properties" className="button-button-round button-color-primary">
            <div className="button-content">
              <div className="button-button-round-text">
                <span data-text="Browse Properties">Browse Properties</span>
              </div>
            </div>
          </Link>
          <Link to="/" className="not-found-home">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
