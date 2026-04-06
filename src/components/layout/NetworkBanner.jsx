import useNetworkStatus from '../../hooks/useNetworkStatus'

export default function NetworkBanner() {
  const { online, slow } = useNetworkStatus()

  if (online && !slow) return null

  const message = online
    ? 'Slow network detected. Data may take a little longer to load.'
    : 'You are offline. Some live data and actions may be unavailable.'

  const style = {
    padding: '0.9rem 1.4rem',
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: 600,
    color: online ? '#7a4b00' : '#8f1d1d',
    background: online ? '#fff4d6' : '#fde7e7',
    borderBottom: `1px solid ${online ? '#f1d28a' : '#f5bcbc'}`,
  }

  return <div style={style}>{message}</div>
}
