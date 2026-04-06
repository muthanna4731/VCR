import { useEffect, useState } from 'react'

function getConnectionState() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const effectiveType = connection?.effectiveType ?? ''
  const saveData = Boolean(connection?.saveData)
  const slow = saveData || ['slow-2g', '2g'].includes(effectiveType)

  return {
    online: navigator.onLine,
    slow,
  }
}

export default function useNetworkStatus() {
  const [state, setState] = useState(() => getConnectionState())

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const update = () => setState(getConnectionState())

    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    connection?.addEventListener?.('change', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      connection?.removeEventListener?.('change', update)
    }
  }, [])

  return state
}
