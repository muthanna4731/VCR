import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BOOT_IMAGE_SOURCES, HERO_IMAGE_SOURCES } from '../../lib/bootAssets'

/* The intro plays only when the visitor's first page load is the home page
   (a reload of "/" counts). Arriving at "/" by in-app navigation, or coming
   back to it later in the same page session, goes straight to the site. The
   path is read at module load, before the router can change it. */
const FIRST_PATH = typeof window === 'undefined' ? '' : window.location.pathname
let played = false

/* With reduced motion the visitor gets the site straight away: no counter,
   no slide, no hero zoom (index.html applies the same check to the static
   copy). */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function shouldPlayIntro() {
  return !played && FIRST_PATH === '/' && !prefersReducedMotion()
}

/* A slow connection must not keep anyone behind the counter. Past this the
   site is shown with whatever has landed. */
const MAX_WAIT_MS = 8000

/* Even on a warm cache the count should read as a count, not a flicker. */
const MIN_DURATION_MS = 1400

/* Hold at 100 for a beat so the number reads as finished before it moves. */
const HOLD_AT_100_MS = 260

/* Must match the .intro--out transition in index.html. */
const EXIT_MS = 1100

/**
 * Resolves once the image is fetched and decoded. Never rejects: a missing
 * file must not strand the visitor behind a counter that can't finish.
 *
 * @param {string} src
 * @returns {Promise<void>}
 */
function preloadImage(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => (img.decode ? img.decode().then(resolve, resolve) : resolve())
    img.onerror = () => resolve()
    img.src = src
  })
}

/* Wheel, touch and keyboard scrolling are swallowed while the curtain is
   down, so the reveal always lands on the hero. Done with listeners instead
   of overflow:hidden so the scrollbar doesn't vanish and shift the layout
   that GSAP measures on mount. */
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])

function lockScroll() {
  const block = e => e.preventDefault()
  const blockKeys = e => { if (SCROLL_KEYS.has(e.key)) e.preventDefault() }
  window.addEventListener('wheel', block, { passive: false })
  window.addEventListener('touchmove', block, { passive: false })
  window.addEventListener('keydown', blockKeys)
  return () => {
    window.removeEventListener('wheel', block)
    window.removeEventListener('touchmove', block)
    window.removeEventListener('keydown', blockKeys)
  }
}

/**
 * Full-screen run-up counter (000 → 100), centred like the truespirits.in
 * loader, driven by real asset progress. At
 * 100 the whole panel slides up and off, unveiling the hero underneath.
 * Markup and styles mirror the static .intro in index.html, which shows the
 * same "000" before JavaScript arrives, so the hand-off is invisible.
 *
 * @param {{ onReveal?: () => void }} props  onReveal fires as the panel starts moving.
 */
export default function IntroLoader({ onReveal }) {
  const [active] = useState(shouldPlayIntro)
  const [count, setCount] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [mounted, setMounted] = useState(active)
  const onRevealRef = useRef(onReveal)
  onRevealRef.current = onReveal

  useEffect(() => {
    if (!active) return undefined

    let cancelled = false
    let raf = 0
    const timers = []
    const unlockScroll = lockScroll()
    const previousRestoration = history.scrollRestoration
    if (previousRestoration) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    /* The page behind the curtain is covered but would otherwise still take
       Tab focus and be read out by screen readers, and following a covered
       link mid-intro would leave it half-finished. inert takes it out of
       both until the reveal. The curtain itself is portalled outside #root. */
    const root = document.getElementById('root')
    if (root) root.inert = true

    /* Undo everything the intro changed. Safe to call twice (reveal, then
       unmount). */
    let released = false
    const release = () => {
      if (released) return
      released = true
      unlockScroll()
      if (root) root.inert = false
      if (previousRestoration) history.scrollRestoration = previousRestoration
      document.documentElement.classList.remove('intro-boot')
    }

    /* Hero images first in the list so they decode first; then everything
       else the home page shows, so nothing pops in after the reveal. */
    const images = [...new Set([...HERO_IMAGE_SOURCES, ...BOOT_IMAGE_SOURCES])]
    const total = images.length + 1 // +1 for fonts
    let settled = 0
    let target = 0
    const bump = () => {
      settled += 1
      target = Math.round((settled / total) * 100)
    }

    const work = [
      ...images.map(src => preloadImage(src).then(bump)),
      (document.fonts?.ready ?? Promise.resolve()).catch(() => {}).then(bump),
    ]

    let complete = false
    const startedAt = performance.now()
    Promise.race([
      Promise.all(work),
      new Promise(resolve => timers.push(setTimeout(resolve, MAX_WAIT_MS))),
    ]).then(() => {
      complete = true
      target = 100
    })

    /* Real progress is lumpy (one big image lands as a single event), so the
       shown number eases toward the true value instead of snapping. It is
       also capped by elapsed time so a warm cache still runs up visibly, and
       never shows 100 before the work is actually done. */
    let shown = 0
    const tick = () => {
      if (cancelled) return
      const elapsed = performance.now() - startedAt
      const timeCap = Math.min(100, (elapsed / MIN_DURATION_MS) * 100)
      const ceiling = Math.min(complete ? 100 : Math.min(target, 96), timeCap)
      const delta = ceiling - shown
      if (delta > 0) shown += Math.max(0.6, delta * 0.12)
      const next = Math.min(100, Math.round(shown))
      setCount(next)

      if (next >= 100 && complete) {
        timers.push(setTimeout(() => {
          if (cancelled) return
          played = true
          window.scrollTo(0, 0)
          release()
          setLeaving(true)
          onRevealRef.current?.()
          timers.push(setTimeout(() => !cancelled && setMounted(false), EXIT_MS + 50))
        }, HOLD_AT_100_MS))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      release()
    }
  }, [active])

  if (!mounted) return null

  // Portalled to <body>: rendered inside <main> it sat in a lower stacking
  // context than the sticky header, which painted on top of the curtain.
  return createPortal(
    <div
      className={`intro${leaving ? ' intro--out' : ''}`}
      role="progressbar"
      aria-label="Loading VCR Builders and Developers"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={count}
    >
      <div className="intro__count">
        <span className="intro__num">{String(count).padStart(3, '0')}</span>
      </div>
      <div className="intro__bar" aria-hidden="true">
        <span className="intro__bar-fill" style={{ transform: `scaleX(${count / 100})` }} />
      </div>
    </div>,
    document.body,
  )
}
