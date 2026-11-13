import { useLayoutEffect } from 'react'
import '../../css/reveal.css'

/*
 * Site-wide scroll reveal: the hero headline's entrance (rise 28px + fade,
 * ease-out-cubic, 0.9s, cascading) applied to content across the marketing
 * site as it scrolls into view, so every page feels alive, not just the hero.
 *
 * How it works
 *  - Scans <main> and <footer> for content blocks (headings, paragraphs,
 *    images, buttons, cards...). When a card matches, its inner text does not
 *    animate separately: only the outermost match moves, so things never
 *    double-animate.
 *  - Each block gets .reveal-init (hidden, 28px down) before paint and
 *    .reveal-in when it enters the viewport. Blocks entering together are
 *    staggered top-to-bottom, left-to-right, like the hero's cascade.
 *  - When a block has finished, both classes are removed so its own hover
 *    transitions and transforms work exactly as before.
 *  - New content (route changes, data that loads after mount) is picked up
 *    by a MutationObserver. Its callback runs before the browser paints, so
 *    nothing flashes visible and then hides.
 *
 * Left alone: the hero (it has its own timeline), the intro counter, the
 * scrolling marquee track (CSS-animated transform), anything marked
 * [data-no-reveal], and everyone with prefers-reduced-motion.
 */

const CANDIDATES = [
  'h1', 'h2', 'h3', 'h4',
  'p', 'li', 'blockquote', 'table', 'form',
  'img', 'video',
  '.button-button-round',
  '[class*="card"]',
  '.features-item',
  '.swiper-slide',
].join(',')

// .services-item-bg: Completed Projects' hover images, clipped until hovered.
const EXCLUDED = '.hero-root, .intro, .marquee-track, .services-item-bg, [data-no-reveal], .header-wrapper, .burger-menu-root'

const STAGGER_MS = 80
const MAX_STAGGER_STEPS = 8
const DURATION_MS = 900

function shouldSkip(el) {
  if (el.closest(EXCLUDED)) return true
  if (el.dataset.revealDone !== undefined) return true
  const style = getComputedStyle(el)
  if (style.position === 'fixed' || style.display === 'none') return true
  return false
}

/** Outermost candidates only: a card animates as one, its text inside doesn't. */
function collect(roots) {
  const found = new Set()
  for (const root of roots) {
    if (!root) continue
    if (root.matches?.(CANDIDATES)) found.add(root)
    root.querySelectorAll?.(CANDIDATES).forEach(el => found.add(el))
  }
  return [...found].filter(el => {
    if (shouldSkip(el)) return false
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (found.has(p) || p.classList.contains('reveal-init')) return false
    }
    return true
  })
}

/**
 * Nearest ancestor that clips its content sideways (a swipeable row of cards
 * on phones). Cards off to the right never cross the viewport, so they would
 * stay hidden; instead the whole row reveals when the row scrolls into view.
 */
function horizontalClipper(el) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (p.matches('main, footer')) return null
    const ox = getComputedStyle(p).overflowX
    if (ox !== 'visible' && p.scrollWidth > p.clientWidth + 1) return p
  }
  return null
}

export default function ScrollReveal() {
  useLayoutEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    if (!('IntersectionObserver' in window)) return undefined

    const timers = new Set()
    const pending = new Set()
    const groups = new Map() // sideways row → its cards waiting to reveal

    const finish = el => {
      pending.delete(el)
      el.classList.remove('reveal-init', 'reveal-in')
      el.style.removeProperty('--reveal-delay')
    }

    const io = new IntersectionObserver((entries) => {
      const entering = entries
        .filter(e => e.isIntersecting)
        .flatMap(e => {
          io.unobserve(e.target)
          const group = groups.get(e.target)
          if (!group) return [e.target]
          groups.delete(e.target)
          return [...group]
        })
        .sort((a, b) => {
          const ra = a.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          return Math.round(ra.top - rb.top) || Math.round(ra.left - rb.left)
        })

      entering.forEach((el, i) => {
        const delay = Math.min(i, MAX_STAGGER_STEPS) * STAGGER_MS
        el.style.setProperty('--reveal-delay', `${delay}ms`)
        el.classList.add('reveal-in')
        const t = setTimeout(() => { timers.delete(t); finish(el) }, delay + DURATION_MS + 100)
        timers.add(t)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })

    const prepare = (roots) => {
      for (const el of collect(roots)) {
        el.dataset.revealDone = ''
        el.classList.add('reveal-init')
        pending.add(el)
        const row = horizontalClipper(el)
        if (row) {
          if (!groups.has(row)) {
            groups.set(row, new Set())
            io.observe(row)
          }
          groups.get(row).add(el)
        } else {
          io.observe(el)
        }
      }
    }

    const scopes = () => [document.querySelector('main'), document.querySelector('footer')]
    prepare(scopes())

    const mo = new MutationObserver((mutations) => {
      const added = []
      for (const m of mutations) {
        m.addedNodes.forEach(n => { if (n.nodeType === 1) added.push(n) })
      }
      if (!added.length) return
      const inScope = added.filter(n => n.closest?.('main, footer'))
      if (inScope.length) prepare(inScope)
    })
    mo.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      timers.forEach(clearTimeout)
      // Show anything still waiting, and unmark it so a remount (StrictMode,
      // or returning to the site from the app) can animate it again.
      for (const el of [...pending]) {
        finish(el)
        delete el.dataset.revealDone
      }
    }
  }, [])

  return null
}
