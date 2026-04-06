import '../css/properties.css'

export default function PaperworkPage() {
  const docs = [
    {
      title: 'RERA Registration',
      desc: 'All VCR layouts are registered under the Real Estate (Regulation and Development) Act, 2016. Registration numbers are available on request and verifiable on the Karnataka RERA portal.',
    },
    {
      title: 'Title Deed & Ownership',
      desc: 'Clear and marketable title deeds are maintained for every layout. Buyers receive a certified copy of the title deed at the time of registration.',
    },
    {
      title: 'Layout Approval',
      desc: 'All layouts hold valid approvals from the respective local bodies — BDA, MUDA, or panchayat — before plots are offered for sale.',
    },
    {
      title: 'Encumbrance Certificate',
      desc: 'An encumbrance certificate (EC) confirming the property is free from any legal dues or mortgages is provided to every buyer during the sale process.',
    },
    {
      title: 'Khata & Tax Documents',
      desc: 'Khata transfer and property tax documents are facilitated by VCR post-registration. Our team assists buyers through every step of the mutation process.',
    },
    {
      title: 'Sale Agreement',
      desc: 'A comprehensive sale agreement is executed before the final registration. The agreement covers payment schedule, possession timeline, and plot specifications.',
    },
  ]

  return (
    <div className="contact-page">
      <div className="container-container">
        <h1 className="contact-page-title">Paperwork</h1>
        <p className="contact-page-subtitle">
          Every VCR property comes with complete, transparent documentation. Here's what to expect.
        </p>

        <div className="paperwork-grid">
          {docs.map(d => (
            <div key={d.title} className="paperwork-card">
              <div className="paperwork-card-title">{d.title}</div>
              <p className="paperwork-card-desc">{d.desc}</p>
            </div>
          ))}
        </div>

        <div className="paperwork-cta">
          <p>Have questions about a specific document?</p>
          <a href="/contact" className="button-button-round button-color-primary">
            <div className="button-content">
              <div className="button-button-round-text">
                <span data-text="Contact Us">Contact Us</span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
