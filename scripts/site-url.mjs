// Resolves the canonical origin used in <link rel="canonical">, sitemap.xml,
// JSON-LD and llms.txt. Shared by vite.config.js and scripts/prerender.mjs.
//
// Priority:
//   1. SITE_URL / VITE_SITE_URL  — set this once the custom domain is live
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel system env, present on Vercel builds
//   3. fallback below
// Live custom domain (Vercel project "vcr"). The old vcr-three.vercel.app
// alias is gone (404), so it must never be the fallback again.
const FALLBACK_SITE_URL = 'https://vcrdevelopers.in'

export function resolveSiteUrl(env = process.env) {
  const explicit = env.SITE_URL || env.VITE_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  return FALLBACK_SITE_URL
}

export function isFallbackSiteUrl(url) {
  return url === FALLBACK_SITE_URL
}
