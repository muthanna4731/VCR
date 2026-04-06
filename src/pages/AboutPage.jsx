import '../css/properties.css'
import mdProfileImg from '../images/MD-Profile.webp'

export default function AboutPage() {
  return (
    <div className="contact-page">
      <div className="container-container">
        <h1 className="contact-page-title">From Farmer's Son to Real Estate Visionary
        </h1>

        <div className="about-story">
          <div className="about-story-text">
            <h2 className="about-section-heading">The Journey of V.C Ravikumar</h2>
            <img src={mdProfileImg} alt="V.C Ravikumar" className="about-profile-img" />
            <p>
              V C Ravikumar, Managing Director of VCR Builders and Developers, is a testament to what
              determination and hard work can achieve. Hailing from a humble farming family in Vadiandahalli,
              Srirangapatna Taluk, he overcame early hardships with the support of his sister and brother-in-law
              to complete his ITI in Melukote and a diploma from BTL Polytechnic, Bangalore.
            </p>
            <p>
              Starting his career with a monthly wage of just ₹500, Ravikumar worked across several industries
              before striking out on his own. In 1996, he launched a small travel and STD booth in Bangalore,
              backed by the steadfast support of his wife, Shilpa. After facing setbacks, he returned to his
              roots, where friends helped him take his first steps in real estate.
            </p>
            <p>
              In 2006, he founded VCR Builders and Developers in Srirangapatna. His breakthrough came with a
              landmark 12-acre island villa project from 2010 to 2014, which earned wide acclaim. Today, VCR
              is actively developing 8 layouts — 3 in Hunsur and 3 in Srirangapatna — and employs a growing
              team of over 10 people.
            </p>

            <h2 className="about-section-heading" style={{ marginTop: '4rem' }}>Our Values</h2>
            <p className="about-values-intro">
              At VCR, success means more than building properties — it means building lives. As Regional Head of
              Lions Club Mysore and President of NAREDCO Mysuru Chapter, Ravikumar supports education for
              underprivileged students, offers land and homes to employees, and sponsors competitive exam training
              including IAS coaching. During the COVID-19 crisis, he distributed over 500 food kits worth ₹5 lakh
              across Mysuru, Mandya, and Bengaluru. He also actively supports organic farmers and individuals
              facing health and educational challenges.
            </p>

            <h2 className="about-section-heading" style={{ marginTop: '4rem' }}>Our Promise</h2>
            <p className="about-promise">
              With unwavering family support and a community-first approach, VCR Builders and Developers continues
              to transform challenges into milestones — and remains a beacon of hope for many.
            </p>
          </div>
          
          <div className="about-contact-block-wrapper">
            <div className="about-contact-block">
              <div className="about-contact-heading">Get in Touch</div>
              <div className="about-contact-item">
                <span className="about-contact-label">Head Office</span>
                <span>Jayalakshmipuram, Mysore, 570012</span>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Email</span>
                <a href="mailto:vcrdevelopers@gmail.com">vcrdevelopers@gmail.com</a>
              </div>
              <div className="about-contact-item">
                <span className="about-contact-label">Phone</span>
                <a href="tel:+12129949965">+1 212 994 9965</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
