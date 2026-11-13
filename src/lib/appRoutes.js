// Routes that belong to the RealEstateOS app rather than the marketing site.
// Keep in sync with the inline script in index.html, which applies the same
// check before React loads so the first paint already has the right scale.
const APP_PREFIXES = ['/admin', '/my', '/login', '/agent', '/app']

export function isAppPath(pathname) {
  return APP_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isStaffRole(role) {
  return ['admin', 'owner', 'manager'].includes(role)
}

/** Where a signed-in user's portal lives, by profile role. */
export function homeForRole(role) {
  if (isStaffRole(role)) return '/admin'
  if (role === 'buyer') return '/my'
  if (role === 'agent') return '/agent'
  return null
}

const APP_FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Inter:wght@400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
]

/**
 * Adds the dashboard fonts/icons once. index.html already adds them when the
 * first page load is an app route; this covers arriving by client navigation.
 */
export function ensureAppFonts() {
  if (document.head.querySelector('link[data-app-font]')) return
  for (const href of APP_FONT_URLS) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-app-font', '')
    document.head.appendChild(link)
  }
}
