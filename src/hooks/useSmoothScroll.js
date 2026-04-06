import { useEffect } from 'react'

export default function useSmoothScroll(headerRef) {
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a[data-scroll]')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || !href.startsWith('#')) return
      const target = document.querySelector(href)
      if (!target) return
      e.preventDefault()

      const headerHeight = headerRef?.current
        ? headerRef.current.getBoundingClientRect().height
        : 0
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16

      window.scrollTo({ top, behavior: 'smooth' })

      // Close burger menu if open
      const burgerBtn = document.querySelector('.burger-btn-btn')
      if (burgerBtn && burgerBtn.getAttribute('aria-expanded') === 'true') {
        burgerBtn.click()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [headerRef])
}
