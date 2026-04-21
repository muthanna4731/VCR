import { Link } from 'react-router'
import { ArrowSvg } from '../ui/ArrowSvg'

export default function ValuesSection() {
  return (
    <section id="values">
      <div className="rewired-wrapper">
        <div className="container-container">
          <div className="assymetric-cols-row">
            <div className="assymetric-cols-col">
              <div className="rewired-left-col">
                <div>
                  <h2 className="rewired-title">
                    <div>Build your house,</div>
                    <div className="em">Buy your land.</div>
                  </h2>
                </div>
                <Link to="/properties" className="button-button-round button-color-primary"
                  aria-haspopup="dialog" aria-expanded="false" data-state="closed">
                  <div className="button-content">
                    <div className="button-button-round-text">
                      <span data-text="Explore Projects">Explore Projects</span>
                    </div>
                    <span className="button-icon-after"><ArrowSvg /></span>
                  </div>
                </Link>
              </div>
            </div>
            <div className="assymetric-cols-col">
              <div>
                <div className="rewired-label">Values:</div>
                <div>
                  <div className="rewired-list-item" data-index="01">
                    <span>Uncompromising Quality.{' '}
                      <span className="em"> At VCR Builders and Developers, every project is held to the highest standards — because your trust is built on the ground we deliver.</span>
                    </span>
                  </div>
                  <div className="rewired-list-item" data-index="02">
                    <span>100% Vastu-Compliant Plots. <span className="em">Every plot is thoughtfully designed to be fully Vastu-compliant — bringing harmony and positive energy to the home you build.</span></span>
                  </div>
                  <div className="rewired-list-item" data-index="03">
                    <span>Gated Community Living. <span className="em">All VCR projects are designed as secure gated communities, giving you and your family the privacy and peace of mind you deserve.</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
