import vcrLogo from '../../images/VCR Logo-optimized.webp'
import feature3 from '../../images/feature-3-optimized.webp'

export default function VCRSection() {
  return (
    <section className="arrows-section-root">
      <div className="container-container">
        <div className="arrows-section-title">
          <h2>Welcome <span className="em">to</span></h2>
        </div>

        <div className="arrows-section-arrows vcr-container">

          {/* ── NEW: Logo window ─────────────────────────────────────────────
              The VCR logo silhouette acts as a mask; the house photo shows
              through it. To revert to the original three-card V/C/R effect,
              delete the div below and uncomment the ORIGINAL block further down.
          ─────────────────────────────────────────────────────────────────── */}
          <div
            className="vcr-logo-window"
            style={{
              maskImage: `url(${vcrLogo})`,
              WebkitMaskImage: `url(${vcrLogo})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          >
            <img src={feature3} alt="" className="vcr-logo-window-img" loading="lazy" decoding="async" draggable="false" />
          </div>

          {/* ── ORIGINAL — uncomment to revert ──────────────────────────────
          import feature1b from '../../images/feature-1b.webp'
          import feature2b from '../../images/feature-2b.webp'
          import feature3 from '../../images/feature-3.webp'

          <div className="arrows-section-arrow vcr-v">
            <img alt="" loading="lazy" width="692" height="880" decoding="async" style={{ color: 'transparent' }} src={feature1b} />
          </div>
          <div className="arrows-section-arrow vcr-c">
            <img alt="" loading="lazy" width="692" height="880" decoding="async" style={{ color: 'transparent' }} src={feature2b} />
          </div>
          <div className="arrows-section-arrow vcr-r">
            <img alt="" loading="lazy" width="692" height="880" decoding="async" style={{ color: 'transparent' }} src={feature3} />
          </div>
          ─────────────────────────────────────────────────────────────────── */}

        </div>

        <div className="arrows-section-text">
          <p>Since 2010, VCR Builders and Developers has been shaping Karnataka's residential landscape — one premium plot at a time.{' '}
            <span className="em">Every project we deliver is gated, Vastu-compliant, MUDA-approved, and backed by clear titles and partner bank financing. Spacious layouts. Open-air living. Built for the life you've earned.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
