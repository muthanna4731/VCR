import { ArrowSvg } from '../ui/ArrowSvg'
import vcrLogo from '../../images/VCR Logo-optimized.webp'

function NewsletterForm() {
  return (
    <div className="footer-newsletter-form">
      <form>
        <div className="footer-input-container">
          <div className="form-text-input-form-input">
            <div className="text-input-input-wrapper form-text-input-input-wrapper footer-input-wrapper text-input-dark">
              <input type="text" className="text-input-input"
                placeholder="Enter address" autoComplete="on" name="email" defaultValue="" />
            </div>
          </div>
          <button id="btn_newsletter_signup_footer" type="submit"
            className="footer-newsletter-submit-btn"><ArrowSvg /></button>
        </div>
      </form>
    </div>
  )
}

function Socials() {
  return (
    <div className="footer-socials">
      <a href="https://www.facebook.com/p/VCR-Builders-Developers-61577202737293/" target="_blank" rel="noopener noreferrer" className="footer-social-link">Facebook</a>
      <a href="https://www.instagram.com/vcrdevelopers/" target="_blank" rel="noopener noreferrer" className="footer-social-link">Instagram</a>
      <a href="#" target="_blank" rel="noopener noreferrer" className="footer-social-link">Youtube</a>
    </div>
  )
}

export default function Footer({ isHome }) {
  return isHome ? <HomeFooter /> : <InnerFooter />
}

function HomeFooter() {
  return (
    <div className="footer-wrapper">
      <div className="container-container">
        <div className="footer-content">
          <div className="footer-newsletter-container">
            <div>
              <div className="footer-newsletter-title">Subscribe to our Newsletter!</div>
              <NewsletterForm />
            </div>
            <div className="footer-contacts">
              <div data-contact="address" className="footer-contact">
                <div className="footer-contact-label">Head Office</div>
                <div className="footer-contact-value">
                  <a href="geo:12.3051,76.6551">
                    <div>Jayalakshmipuram, Mysore, 570012</div>
                  </a>
                </div>
              </div>
              <div data-contact="email" className="footer-contact">
                <div className="footer-contact-label">Email Us</div>
                <div className="footer-contact-value"><a href="mailto:vcrdevelopers@gmail.com">vcrdevelopers@gmail.com</a></div>
              </div>
              <div data-contact="phone" className="footer-contact">
                <div className="footer-contact-label">Call Us</div>
                <div className="footer-contact-value"><a href="tel:+12129949965"><span>+1 212 994 9965</span></a></div>
              </div>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-nav">
              <a className="footer-nav-link" href="#why-vcr" data-scroll=""><span data-text="Why VCR">Why VCR</span></a>
              <a className="footer-nav-link" href="#values" data-scroll=""><span data-text="Values">Values</span></a>
              <a className="footer-nav-link" href="#completed-projects" data-scroll=""><span data-text="Completed Projects">Completed Projects</span></a>
              <a className="footer-nav-link" href="#upcoming-projects" data-scroll=""><span data-text="Upcoming Projects">Upcoming Projects</span></a>
              <a className="footer-nav-link" href="#testimonials" data-scroll=""><span data-text="Testimonials">Testimonials</span></a>
            </div>
            <Socials />
          </div>
          <div className="footer-logo"><img src={vcrLogo} alt="VCR" /></div>
          <div className="footer-copyright-container">
            <div className="footer-sublinks">
              <a href="/terms-of-service">Terms</a>
              <a href="/privacy-policy">Privacy policy</a>
            </div>
            <div>VCR Builders and Developers</div>
            <div>Copyright © 2026</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InnerFooter() {
  return (
    <div className="footer-wrapper">
      <div className="container-container">
        <div className="footer-content">
          <div className="footer-newsletter-container">
            <div>
              <div className="footer-newsletter-title">Subscribe to our Newsletter!</div>
              <NewsletterForm />
            </div>
            <div className="footer-contacts">
              <div data-contact="address" className="footer-contact">
                <div className="footer-contact-label">Head Office</div>
                <div className="footer-contact-value">
                  <a href="geo:12.3051,76.6551">
                    <div>Jayalakshmipuram, Mysore, 570012</div>
                  </a>
                </div>
              </div>
              <div data-contact="email" className="footer-contact">
                <div className="footer-contact-label">Email Us</div>
                <div className="footer-contact-value"><a href="mailto:vcrdevelopers@gmail.com">vcrdevelopers@gmail.com</a></div>
              </div>
              <div data-contact="phone" className="footer-contact">
                <div className="footer-contact-label">Call Us</div>
                <div className="footer-contact-value"><a href="tel:+12129949965"><span>+1 212 994 9965</span></a></div>
              </div>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-nav">
              <a className="footer-nav-link" href="/search"><span data-text="Search">Search</span></a>
              <a className="footer-nav-link" href="/agents"><span data-text="Agents">Agents</span></a>
              <a className="footer-nav-link" href="/join"><span data-text="Join">Join</span></a>
            </div>
            <Socials />
          </div>
          <div className="footer-logo"><img src={vcrLogo} alt="VCR" /></div>
          <div className="footer-copyright-container">
            <div className="footer-sublinks">
              <a href="/terms-of-service">Terms</a>
              <a href="/privacy-policy">Privacy policy</a>
            </div>
            <div>VCR Builders and Developers</div>
            <div>Copyright © 2026</div>
          </div>
        </div>
      </div>
    </div>
  )
}
