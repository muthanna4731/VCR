export default function WhyUsSection() {
  return (
    <section className="why-us-root" id="why-vcr">
      <div className="container-container">
        <div className="why-us-grid">
          <div className="why-us-title">
            <h2>Why VCR</h2>
          </div>
          <div className="why-us-text">Plots. Sites. Premium real estate.{' '}
            <span className="em"> Whatever you're looking for, VCR builds it right — no compromises, no surprises.</span>
          </div>
        </div>
        <div className="why-us-preview">
          <video src="/videos/why-us.mp4" title="Why VCR" autoPlay playsInline loop muted></video>
        </div>
      </div>
    </section>
  )
}
