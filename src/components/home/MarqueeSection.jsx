const brands = ['MysoreTimes', 'Times Real Estate Awards', 'NAREDCO Mysore']

export default function MarqueeSection() {
  return (
    <section className="marquee-section">
      <p className="marquee-label">Featured in</p>
      <div className="marquee-track">
        <div className="marquee-inner">
          {/* First set */}
          {brands.map((b, i) => <span key={i} className="marquee-logo">{b}</span>)}
          {/* Duplicated for seamless loop */}
          {brands.map((b, i) => <span key={`dup-${i}`} className="marquee-logo">{b}</span>)}
        </div>
      </div>
    </section>
  )
}
