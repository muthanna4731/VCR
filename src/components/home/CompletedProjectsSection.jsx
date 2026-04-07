import { ServiceArrowSvg } from '../ui/ArrowSvg'
import buyImg from '../../images/buy.webp'
import sellImg from '../../images/sell.webp'
import rentImg from '../../images/rent.webp'

export default function CompletedProjectsSection() {
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
        <button className="services-item" type="button" aria-haspopup="dialog" aria-expanded="false" data-state="closed">
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent' }}
                src={buyImg} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
              <h3>A piece of land in a land of peace. A gated community featuring managed farm lands.</h3>
            </div>
            <div className="services-item-more"><span>Kapila Weekend Villa</span><ServiceArrowSvg /></div>
          </div>
        </button>
        <button className="services-item" type="button" aria-haspopup="dialog" aria-expanded="false" data-state="closed">
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent' }}
                src={sellImg} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
            </div>
            <div className="services-item-more"><span>Devagiri Enclave</span><ServiceArrowSvg /></div>
          </div>
        </button>
        <button className="services-item" type="button" aria-haspopup="dialog" aria-expanded="false" data-state="closed">
          <div className="container-container">
            <div className="services-item-bg">
              <img alt="" loading="lazy" decoding="async"
                style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0, color: 'transparent' }}
                src={rentImg} />
            </div>
            <div className="services-item-num"></div>
            <div className="services-item-text">
              <h3>An experience.</h3>
            </div>
            <div className="services-item-more"><span>RM Layout</span><ServiceArrowSvg /></div>
          </div>
        </button>
      </div>
    </section>
  )
}
