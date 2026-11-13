import { useEffect } from 'react'

/**
 * Sets <title> for app screens (login, dashboard, buyer portal, agent), which
 * sit outside RootLayout's SEO hook and otherwise kept the home page's title.
 *
 * @param {string} title
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title
  }, [title])
}
