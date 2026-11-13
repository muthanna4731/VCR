import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowSvg } from '../ui/ArrowSvg'
import backImg from '../../images/back.webp'
import houseImg from '../../images/house-optimized.webp'
import smokeImg from '../../images/smoke.webp'

gsap.registerPlugin(ScrollTrigger)

const HERO_PRIORITY_IMAGES = [backImg, houseImg]

/**
 * @param {{
 *   headerRef: import('react').RefObject<HTMLElement>,
 *   revealed?: boolean,  // false while the intro counter still covers the page
 *   unveil?: boolean,    // true when the intro played, so the hero settles in as it's uncovered
 * }} props
 */
export default function HeroSection({ headerRef, revealed = true, unveil = false }) {
  const sectionRef = useRef(null)
  const [imagesReady, setImagesReady] = useState(false)

  // Preload only the critical hero images before revealing the page.
  useEffect(() => {
    let cancelled = false
    Promise.all(
      HERO_PRIORITY_IMAGES.map(src => new Promise(resolve => {
        const img = new Image()
        img.onload = resolve
        img.onerror = resolve
        img.src = src
      }))
    ).then(() => { if (!cancelled) setImagesReady(true) })
    return () => { cancelled = true }
  }, [])

  // Cascade-in animation — runs once the hero images are in and, on a first
  // load of "/", once the intro counter starts sliding away.
  //
  // fromTo + gsap.context: the old gsap.from() calls were killed mid-tween by
  // StrictMode's effect re-run and the next from() took the half-way value as
  // its end state, leaving the header stuck ~5px up with an inline transform
  // that also overrode the header's hide-on-scroll class. ctx.revert() puts
  // every inline style back, and clearProps removes them when tweens finish.
  useEffect(() => {
    if (!imagesReady || !revealed) return undefined
    // Reduced motion: the hero is simply there, no zoom or cascade.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const header = headerRef?.current

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: unveil ? 0 : 0.35 })

      if (unveil) {
        // The panel moves up off the hero; the scene settles from a slight
        // zoom underneath it, which is what makes it read as an unveiling.
        tl.fromTo('.hero-bg', { scale: 1.12 },
          { scale: 1, duration: 1.8, ease: 'power3.out', clearProps: 'transform' }, 0)
      }

      const textAt = unveil ? 0.55 : 0
      tl.fromTo('.hero-title h1', { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }, textAt)
        .fromTo('.hero-text p', { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.5')
        .fromTo('.hero-actions', { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.4')

      if (header) {
        tl.fromTo(header, { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', clearProps: 'transform,opacity' },
          unveil ? 0.45 : 0.1)
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [imagesReady, revealed, unveil, headerRef])

  // Scroll-based animations — set up immediately (don't need images)
  useGSAP(() => {
    const hero = sectionRef.current
    if (!hero) return

    // Logo colour: white over hero, original after.
    // The section after the hero overlaps the hero's last screen, so "past the
    // hero" means that section has reached the bottom of the header — not the
    // hero's own bottom edge. Using the hero's edge left a white logo on a
    // transparent header over the white "Welcome" section for a full screen.
    const header = headerRef?.current
    if (header) {
      header.dataset.overHero = ''
      ScrollTrigger.create({
        trigger: hero.nextElementSibling ?? hero,
        start: () => `top ${header.offsetHeight}px`,
        onEnter: () => { delete header.dataset.overHero },
        onLeaveBack: () => { header.dataset.overHero = '' },
      })
    }

    const composite = hero.querySelector('.hero-composite')
    const compositeHouse = hero.querySelector('.hero-composite .hero-house')
    const standaloneHouse = hero.querySelector('.hero-bg > .hero-house')

    // House parallax & zoom
    const allHouses = [standaloneHouse, compositeHouse].filter(Boolean)
    allHouses.forEach(h => {
      gsap.fromTo(h,
        { scale: 1, yPercent: 0, transformOrigin: 'bottom center' },
        {
          scale: 1.25,
          yPercent: -28,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 }
        }
      )
    })

    // Composite reveal
    if (composite) {
      const compTl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 }
      })
      compTl
        .to(composite, { opacity: 0, duration: 0.28 })
        .to(composite, { opacity: 1, duration: 0.16 })
        .to(composite, { opacity: 1, duration: 0.10 })
        .to(composite, { opacity: 0, duration: 0.16 })
    }

    return () => {
      if (header) delete header.dataset.overHero
    }
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="hero-root">
      <div className="hero-top">
        <div className="hero-bg">
          <div className="hero-back">
            <img alt="" loading="eager" fetchPriority="high" width="3840" height="2612" decoding="async" style={{ color: 'transparent' }} src={backImg} />
          </div>
          <div className="hero-house">
            <img alt="" loading="eager" fetchPriority="high" width="3840" height="3416" decoding="async" style={{ color: 'transparent' }} src={houseImg} />
          </div>
          <div className="hero-composite">
            <div className="hero-house">
              <img alt="" loading="lazy" fetchPriority="auto" width="3840" height="3416" decoding="async" style={{ color: 'transparent' }} src={houseImg} />
            </div>
          </div>
        </div>
        <div className="hero-content">
          <div className="container-container">
            <div className="hero-title">
              <h1>Namma Nadu.<span className="hero-desktop-only"> </span><br className="hero-mobile-only" /><span style={{ whiteSpace: 'nowrap' }}>Namma Property.</span></h1>
            </div>
            <div className="hero-text">
              <p>Your Roots Deserve the Right Ground. <span className="em">Karnataka's most thoughtful layout developers.</span></p>
            </div>
            <div className="hero-actions">
              <div>
                <Link to="/properties" className="button-button-round button-color-primary">
                  <div className="button-content">
                    <div className="button-button-round-text">
                      <span data-text="Browse Properties">Browse Properties</span>
                    </div>
                    <span className="button-icon-after"><ArrowSvg /></span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="hero-overlap">
          <div className="hero-smoke">
            <img alt="" loading="lazy" fetchPriority="low" width="3840" height="1240" decoding="async" style={{ color: 'transparent' }} src={smokeImg} />
          </div>
          <div className="hero-overlay"></div>
        </div>
      </div>
    </section>
  )
}
