import { Link } from 'react-router'
import '../css/properties.css'
import { GUIDE, CONTENT_UPDATED_LABEL, projectsForArea } from '../seo/content'
import { FaqList } from '../components/seo/ContentBlocks'

// One page per entry in AREAS (src/seo/content.js), e.g. /plots-in-srirangapatna
export default function AreaPage({ area }) {
  const projects = projectsForArea(area.key)

  return (
    <div className="contact-page">
      <div className="container-container">
        <article className="seo-article">
          <h1 className="contact-page-title">{area.title}</h1>
          <p className="seo-updated">Updated {CONTENT_UPDATED_LABEL} · VCR Builders and Developers, Mysuru</p>
          {area.intro.map(p => <p key={p} className="seo-lead">{p}</p>)}

          <section className="seo-section">
            <h2 className="about-section-heading">VCR projects in {area.place}</h2>
            <div className="paperwork-grid">
              {projects.map(project => (
                <div key={project.name} className="paperwork-card">
                  <div className="paperwork-card-title">
                    {project.slug ? <Link to={`/properties/${project.slug}`}>{project.name}</Link> : project.name}
                  </div>
                  <p className="paperwork-card-desc">
                    {project.status} · {project.location}{project.acres ? ` · ${project.acres} acres` : ''}
                  </p>
                  <p className="paperwork-card-desc">{project.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="seo-section">
            <h2 className="about-section-heading">{area.place} land prices and approvals</h2>
            {area.market.map(p => <p key={p}>{p}</p>)}
            <p>
              Compare areas and run the full legal checklist in our{' '}
              <Link to={GUIDE.path}>Mysuru plot buying guide</Link>.
            </p>
          </section>

          <section className="seo-section">
            <h2 className="about-section-heading">Questions about {area.place}</h2>
            <FaqList items={area.faq} />
          </section>

          <div className="paperwork-cta">
            <p>Visit a VCR layout in {area.place} — call +91 98860 48471 or send an enquiry.</p>
            <Link to="/contact" className="button-button-round button-color-primary">
              <div className="button-content">
                <div className="button-button-round-text">
                  <span data-text="Contact Us">Contact Us</span>
                </div>
              </div>
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
