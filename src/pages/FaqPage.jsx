import { Link } from 'react-router'
import '../css/properties.css'
import { FAQ, GUIDE } from '../seo/content'
import { FaqList } from '../components/seo/ContentBlocks'

export default function FaqPage() {
  return (
    <div className="contact-page">
      <div className="container-container">
        <article className="seo-article">
          <h1 className="contact-page-title">{FAQ.title}</h1>
          <p className="contact-page-subtitle">
            Buying a plot near Mysuru with VCR Builders and Developers. For prices by area and a full
            legal checklist, read the <Link to={GUIDE.path}>Mysuru plot buying guide</Link>.
          </p>
          <FaqList items={FAQ.items} />
        </article>
      </div>
    </div>
  )
}
