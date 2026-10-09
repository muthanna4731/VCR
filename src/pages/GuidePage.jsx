import { Link } from 'react-router'
import '../css/properties.css'
import { GUIDE, AREAS, CONTENT_UPDATED_LABEL } from '../seo/content'
import { ContentBlocks, Sources } from '../components/seo/ContentBlocks'

export default function GuidePage() {
  return (
    <div className="contact-page">
      <div className="container-container">
        <article className="seo-article">
          <h1 className="contact-page-title">{GUIDE.title}</h1>
          <p className="seo-updated">Updated {CONTENT_UPDATED_LABEL} · VCR Builders and Developers, Mysuru</p>
          {GUIDE.intro.map(p => <p key={p} className="seo-lead">{p}</p>)}

          {GUIDE.sections.map(section => (
            <section key={section.id} id={section.id} className="seo-section">
              <h2 className="about-section-heading">{section.heading}</h2>
              <ContentBlocks blocks={section.body} />
              <Sources sources={section.sources} />
            </section>
          ))}

          <section className="seo-section">
            <h2 className="about-section-heading">Plots by area</h2>
            <ul className="seo-list">
              {AREAS.map(a => <li key={a.path}><Link to={a.path}>{a.title}</Link></li>)}
            </ul>
          </section>

          <div className="paperwork-cta">
            <p>Want to see a VCR layout in person?</p>
            <Link to="/properties" className="button-button-round button-color-primary">
              <div className="button-content">
                <div className="button-button-round-text">
                  <span data-text="Browse Properties">Browse Properties</span>
                </div>
              </div>
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
