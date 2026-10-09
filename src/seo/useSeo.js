import { useEffect } from 'react'
import { SITE_URL } from './content'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Keeps <title>, description, canonical and Open Graph tags in sync during
 * client-side navigation. Crawlers get the same values from the prerendered
 * HTML (scripts/prerender.mjs); this hook only matters once the SPA is running.
 *
 * @param {{ title?: string, description?: string, path?: string } | null} meta
 */
export default function useSeo(meta) {
  const title = meta?.title
  const description = meta?.description
  const path = meta?.path

  useEffect(() => {
    if (!title) return
    const url = `${SITE_URL}${path === '/' ? '/' : path}`
    document.title = title
    setMeta('property', 'og:title', title)
    setMeta('name', 'twitter:title', title)
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    if (path) {
      setCanonical(url)
      setMeta('property', 'og:url', url)
    }
  }, [title, description, path])
}
