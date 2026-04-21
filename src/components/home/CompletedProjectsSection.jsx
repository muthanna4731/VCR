import { ServiceArrowSvg } from '../ui/ArrowSvg'
import buyImg from '../../images/buy.webp'
import sellImg from '../../images/sell.webp'
import rentImg from '../../images/rent.webp'
import useProperties from '../../hooks/useProperties'
import { Link } from 'react-router'

export default function CompletedProjectsSection() {
  const { layouts } = useProperties()

  // Helper to get image by property name (case-insensitive)
  const getImage = (name, fallback) => {
    const layout = layouts.find((l) => l.name.trim().toLowerCase() === name.toLowerCase())
    return layout?.cardImageUrl || layout?.layoutImageUrl || fallback
  }

  return (
    <section className="services-root" id="completed-projects">
      <div className="container-container">
        <div className="services-hgrid">
          <div className="services-hgrid-col">
            <div className="services-caption">Projects</div>
          </div>
          <div className="services-hgrid-col">
            <div className="services-title">
              <h2>
                <div className="services-title">Completed<br /> <span className="em">Projects</span></div>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="services-items">
        <Link
          to="/properties/kapilla-weekend-villa"
          className="services-item"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent', objectFit: 'cover' }}
                src={getImage('Kapila Weekend Villa', buyImg)} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
              <h3>A piece of land in a land of peace. A gated community featuring managed farm lands.</h3>
            </div>
            <div className="services-item-more"><span>Kapilla Weekend Villa</span><ServiceArrowSvg /></div>
          </div>
        </Link>
        <Link
          to="/properties/devagiri-enclave"
          className="services-item"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent', objectFit: 'cover' }}
                src={getImage('Devagiri Enclave', sellImg)} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
            </div>
            <div className="services-item-more"><span>Devagiri Enclave</span><ServiceArrowSvg /></div>
          </div>
        </Link>
        <Link
          to="/properties/rm-layout"
          className="services-item"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent', objectFit: 'cover' }}
                src={getImage('RM Layout', rentImg)} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
              <h3>An experience.</h3>
            </div>
            <div className="services-item-more"><span>RM Layout</span><ServiceArrowSvg /></div>
          </div>
        </Link>
      </div>
    </section>
  )
}


