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

export default function HeroSection({ headerRef }) {
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

  // Cascade-in animation — runs only after images are loaded and overlay fades out
  useEffect(() => {
    if (!imagesReady) return
    const tl = gsap.timeline({ delay: 0.35 })  // 0.35s matches overlay fade duration
    tl.from('.hero-title h1', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out' })
      .from('.hero-text p',   { y: 18, opacity: 0, duration: 0.7, ease: 'power2.out' }, '-=0.5')
      .from('.hero-actions',  { y: 18, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
    gsap.from('.header-wrapper', { y: -30, opacity: 0, duration: 0.8, delay: 0.1, ease: 'power2.out' })
    return () => { tl.kill() }
  }, [imagesReady])

  // Scroll-based animations — set up immediately (don't need images)
  useGSAP(() => {
    const hero = sectionRef.current
    if (!hero) return

    // Logo colour: white over hero, original after
    const header = headerRef?.current
    if (header) {
      header.classList.add('header_-over-hero')
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        onLeave: () => header.classList.remove('header_-over-hero'),
        onEnterBack: () => header.classList.add('header_-over-hero'),
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
      if (header) header.classList.remove('header_-over-hero')
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
