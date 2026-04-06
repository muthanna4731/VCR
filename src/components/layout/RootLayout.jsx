import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import Header from './Header'
import Footer from './Footer'
import LoadingLine from './LoadingLine'
import NetworkBanner from './NetworkBanner'

export default function RootLayout() {
  const headerRef = useRef(null)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isContact = location.pathname === '/contact'

  return (
    <>
      <LoadingLine />
      <NetworkBanner />
      <Header ref={headerRef} isHome={isHome} isContact={isContact} />
      <main>
        <Outlet context={{ headerRef }} />
      </main>
      <Footer isHome={isHome} />
    </>
  )
}
