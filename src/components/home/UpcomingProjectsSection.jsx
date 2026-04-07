import { ArrowSvg } from '../ui/ArrowSvg'
import mortgageImg from '../../images/mortgage-services.webp'
import propertyMgmtImg from '../../images/property-management.webp'
import developmentImg from '../../images/development.webp'

function FeatureItem({ img, alt, title, text }) {
  return (
    <div className="features-item">
      <div className="features-item-bg">
        <img alt={alt} loading="lazy" width="1107" height="940" decoding="async" style={{ color: 'transparent' }} src={img} />
      </div>
      <div className="features-item-title">
        <h3>{title}</h3>
      </div>
      <div className="features-item-text">
        <p>{text}</p>
      </div>
      <div className="features-item-more">
        <button type="button" className="button-button-round button-color-secondary button-inversed"
          aria-haspopup="dialog" aria-expanded="false" data-state="closed">
          <div className="button-content">
            <div className="button-button-round-text"><span data-text="Learn More">Learn More</span></div>
            <span className="button-icon-after"><ArrowSvg /></span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default function UpcomingProjectsSection() {
  return (
    <section className="features-root" id="upcoming-projects">
      <div className="container-container">
        <div className="features-grid">
          <div>
            <div className="features-title">
              <h2>
                <div>Upcoming/Ongoing<span className="em"></span><br /> <span className="em">Projects</span></div>
              </h2>
            </div>
          </div>
          <div>
            <div className="features-text">
              <p>Projects that catch attention.{' '}
                <span className="em">Invest in them early.</span>
              </p>
            </div>
          </div>
        </div>
        <div className="features-items">
  <div className="features-row">
    <FeatureItem img={mortgageImg} alt="VCR Riverview Garden" title="VCR Riverview Garden" text="Srirangpatna - 12 acres" />
    <FeatureItem img={propertyMgmtImg} alt="VCR Ambhabhavi Nagara" title="VCR Ambhabhavi Nagara" text="Hunsur - 11 acres" />
    <FeatureItem img={developmentImg} alt="VCR Devagiri Enclave" title="VCR Devagiri Enclave" text="Hunsur - 5 acres" />
  </div>
  <div className="features-row">
    <FeatureItem img={developmentImg} alt="VCR Nanjundeshwara Township" title="VCR Nanjundeshwara Township" text="Nanjungud - 23 acres" />
    <FeatureItem img={developmentImg} alt="VCR Bhoovaraha" title="VCR Bhoovaraha" text="KRS - 8 acres" />
  </div>
</div>
      </div>
    </section>
  )
}
