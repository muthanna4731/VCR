import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// CSS imports — exact same order as original <link> tags in index.html
import './css/fonts.css'
import './css/shared.css'
import './css/header.css'
import './css/footer.css'
import './css/burger-menu.css'
import './css/loading-line.css'

const DEV_SW_RESET_KEY = 'vcr-dev-sw-reset'

async function clearDevServiceWorkers() {
  if (!('serviceWorker' in navigator)) return false

  const hadController = Boolean(navigator.serviceWorker.controller)
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))

  if (!('caches' in window)) {
    return hadController || registrations.length > 0
  }

  const cacheNames = await caches.keys()
  const appCacheNames = cacheNames.filter((cacheName) => cacheName.startsWith('vcr-'))
  await Promise.all(appCacheNames.map((cacheName) => caches.delete(cacheName)))

  return hadController || registrations.length > 0 || appCacheNames.length > 0
}

if (import.meta.env.DEV) {
  clearDevServiceWorkers()
    .then((needsReload) => {
      if (!needsReload) {
        sessionStorage.removeItem(DEV_SW_RESET_KEY)
        return
      }

      if (sessionStorage.getItem(DEV_SW_RESET_KEY) === '1') return

      sessionStorage.setItem(DEV_SW_RESET_KEY, '1')
      window.location.reload()
    })
    .catch((error) => {
      console.error('Failed to clear dev service worker state', error)
    })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
