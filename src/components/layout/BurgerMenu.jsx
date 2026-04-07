import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'

export default function BurgerMenu({ isHome, isContact, isOpen, onClose }) {
  const menuRef = useRef(null)
  const hasMountedRef = useRef(false)

  const handleLinkClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) {
      onClose()
    }
  }

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    if (!hasMountedRef.current) {
      gsap.set(menu, { opacity: 0, y: -20, pointerEvents: 'none', display: 'none' })
      hasMountedRef.current = true
    }

    if (isOpen) {
      gsap.killTweensOf(menu)
      menu.style.display = 'flex'
      gsap.to(menu, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        pointerEvents: 'auto',
      })
      return
    }

    gsap.killTweensOf(menu)
    gsap.to(menu, {
      opacity: 0,
      y: -20,
      duration: 0.25,
      pointerEvents: 'none',
      onComplete: () => {
        if (!isOpen) menu.style.display = 'none'
      },
    })
  }, [isOpen])

  return (
    <div
      ref={menuRef}
      className={`burger-menu-wrapper${isOpen ? ' burger-menu-wrapper--open' : ''}`}
      style={{ paddingTop: 0 }}
      data-lenis-prevent="true"
      onClick={handleLinkClick}
    >
      <div className="burger-menu-backdrop"></div>
      <div className="burger-menu-content">
        <nav className="burger-menu-nav">
          {isHome ? (
            <>
              <div className="burger-menu-nav-item"><a href="#why-vcr" data-scroll="">Why VCR</a></div>
              <div className="burger-menu-nav-item"><a href="#values" data-scroll="">Values</a></div>
              <div className="burger-menu-nav-item"><a href="#completed-projects" data-scroll="">Completed Projects</a></div>
              <div className="burger-menu-nav-item"><a href="#upcoming-projects" data-scroll="">Upcoming Projects</a></div>
              <div className="burger-menu-nav-item"><a href="#testimonials" data-scroll="">Testimonials</a></div>
            </>
          ) : (
            <>
              <div className="burger-menu-nav-item"><Link to="/properties">Properties</Link></div>
              <div className="burger-menu-nav-item"><Link to="/paperwork">Paperwork</Link></div>
              <div className="burger-menu-nav-item"><Link to="/about">About</Link></div>
            </>
          )}
        </nav>
      </div>
      <div className="burger-menu-actions">
        {(isHome || isContact) ? (
          <Link to="/properties" className="button-button-round button-color-primary">
            <div className="button-content">
              <div className="button-button-round-text"><span data-text="Browse">Browse</span></div>
            </div>
          </Link>
        ) : (
          <Link to="/contact" className="button-button-round button-color-primary">
            <div className="button-content">
              <div className="button-button-round-text"><span data-text="Contact">Contact</span></div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
