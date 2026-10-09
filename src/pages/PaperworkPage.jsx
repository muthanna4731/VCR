import '../css/properties.css'
import { PAPERWORK } from '../seo/content'

export default function PaperworkPage() {

  return (
    <div className="contact-page">
      <div className="container-container">
        <h1 className="contact-page-title">Paperwork</h1>
        <p className="contact-page-subtitle">
          Every VCR property comes with complete, transparent documentation. Here's what to expect.
        </p>

        <div className="paperwork-grid">
          {PAPERWORK.map(d => (
            <div key={d.title} className="paperwork-card">
              <div className="paperwork-card-title">{d.title}</div>
              <p className="paperwork-card-desc">{d.desc}</p>
            </div>
          ))}
        </div>

        <div className="paperwork-cta">
          <p>Have questions about a specific document?</p>
          <a href="/contact" className="button-button-round button-color-primary">
            <div className="button-content">
              <div className="button-button-round-text">
                <span data-text="Contact Us">Contact Us</span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
