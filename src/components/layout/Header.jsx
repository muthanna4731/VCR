import { forwardRef, useState } from 'react'
import { Link } from 'react-router'
import BurgerMenu from './BurgerMenu'
import vcrLogo from '../../images/VCR Logo-optimized.webp'

const Header = forwardRef(function Header({ isHome, isContact }, ref) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showBrowse = isHome || isContact

  return (
    <header ref={ref} className={`header-wrapper header-transparent${isMenuOpen ? ' header--opened' : ''}`}>
      <div className="container-container">
        <div className="header-content">
          <div className="header-logo">
            <Link to="/"><img src={vcrLogo} alt="VCR" /></Link>
          </div>
          {isHome ? <HomeNav /> : <InnerNav />}
          <div className="header-actions">
            {showBrowse ? (
              <Link className="button-button-round button-color-primary" to="/properties">
                <div className="button-content">
                  <div className="button-button-round-text">
                    <span data-text="Browse">Browse</span>
                  </div>
                </div>
              </Link>
            ) : (
              <Link className="button-button-round button-color-primary" to="/contact">
                <div className="button-content">
                  <div className="button-button-round-text">
                    <span data-text="Contact">Contact</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
          <button
            className={`burger-btn-btn header-burger-control${isMenuOpen ? ' burger-btn--active' : ''}`}
            aria-label="Menu control"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(open => !open)}
            type="button"
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <BurgerMenu
        isHome={isHome}
        isContact={isContact}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </header>
  )
})

function HomeNav() {
  return (
    <nav className="header-nav">
      <div className="header-nav-item"><a href="#why-vcr" data-scroll=""><span data-text="Why VCR">Why VCR</span></a></div>
      <div className="header-nav-item"><a href="#values" data-scroll=""><span data-text="Values">Values</span></a></div>
      <div className="header-nav-item"><a href="#completed-projects" data-scroll=""><span data-text="Completed Projects">Completed Projects</span></a></div>
      <div className="header-nav-item"><a href="#upcoming-projects" data-scroll=""><span data-text="Upcoming Projects">Upcoming Projects</span></a></div>
      <div className="header-nav-item"><a href="#testimonials" data-scroll=""><span data-text="Testimonials">Testimonials</span></a></div>
    </nav>
  )
}

function InnerNav() {
  return (
    <nav className="header-nav">
      <div className="header-nav-item"><Link to="/properties"><span data-text="Properties">Properties</span></Link></div>
      <div className="header-nav-item"><Link to="/paperwork"><span data-text="Paperwork">Paperwork</span></Link></div>
      <div className="header-nav-item"><Link to="/about"><span data-text="About">About</span></Link></div>
    </nav>
  )
}

export default Header
