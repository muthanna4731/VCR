import { useState, useRef } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

export default function BurgerMenu({ isHome, isContact }) {
  const menuRef = useRef(null)
  const [, setIsOpen] = useState(false)

  // Attach click listener to the burger button (sibling in parent)
  useGSAP(() => {
    const header = menuRef.current?.closest('header')
    const burger = header?.querySelector('.burger-btn-btn')
    if (!burger || !menuRef.current) return

    const menu = menuRef.current
    menu.style.display = 'none'

    const handleClick = () => {
      const open = burger.getAttribute('aria-expanded') === 'true'
      burger.setAttribute('aria-expanded', !open)
      if (!open) {
        menu.style.display = 'flex'
        menu.style.pointerEvents = 'auto'
        gsap.fromTo(menu, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3 })
        setIsOpen(true)
      } else {
        menu.style.pointerEvents = 'none'
        gsap.to(menu, {
          opacity: 0,
          y: -20,
          duration: 0.3,
          onComplete: () => { menu.style.display = 'none' }
        })
        setIsOpen(false)
      }
    }

    burger.addEventListener('click', handleClick)
    return () => burger.removeEventListener('click', handleClick)
  }, { scope: menuRef })

  const handleLinkClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) {
      const header = menuRef.current?.closest('header')
      const burger = header?.querySelector('.burger-btn-btn')
      if (burger && burger.getAttribute('aria-expanded') === 'true') {
        burger.click()
      }
    }
  }

  return (
    <div ref={menuRef} className="burger-menu-wrapper" style={{ paddingTop: 0 }} data-lenis-prevent="true" onClick={handleLinkClick}>
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
