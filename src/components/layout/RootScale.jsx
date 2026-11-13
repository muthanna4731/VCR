import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'
import { ensureAppFonts, isAppPath } from '../../lib/appRoutes'

/**
 * Toggles html.root-fixed (see fonts.css) as the visitor moves between the
 * marketing site and the app, e.g. dashboard → "View site" → home.
 */
export default function RootScale() {
  const { pathname } = useLocation()

  // Layout effect: switch the scale before paint, so moving between the site
  // and the app never shows a frame at the wrong size.
  useLayoutEffect(() => {
    const app = isAppPath(pathname)
    document.documentElement.classList.toggle('root-fixed', app)
    if (app) ensureAppFonts()
  }, [pathname])

  return null
}
