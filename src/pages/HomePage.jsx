import { useState } from 'react'
import { useOutletContext } from 'react-router'
import '../css/hero.css'
import '../css/home-sections.css'
import '../css/services.css'
import '../css/why-us.css'
import '../css/marquee.css'
import IntroLoader, { shouldPlayIntro } from '../components/home/IntroLoader'
import HeroSection from '../components/home/HeroSection'
import WhyUsSection from '../components/home/WhyUsSection'
import VCRSection from '../components/home/VCRSection'
import ValuesSection from '../components/home/ValuesSection'
import CompletedProjectsSection from '../components/home/CompletedProjectsSection'
import UpcomingProjectsSection from '../components/home/UpcomingProjectsSection'
import TestimonialsSection from '../components/home/TestimonialsSection'
import MarqueeSection from '../components/home/MarqueeSection'
import useSmoothScroll from '../hooks/useSmoothScroll'

export default function HomePage() {
  const { headerRef } = useOutletContext()
  useSmoothScroll(headerRef)
  // Decided once on mount: the intro runs only on a first full load of "/".
  const [unveil] = useState(shouldPlayIntro)
  const [revealed, setRevealed] = useState(() => !unveil)

  return (
    <>
      <IntroLoader onReveal={() => setRevealed(true)} />
      <HeroSection headerRef={headerRef} revealed={revealed} unveil={unveil} />
      <VCRSection />
      <WhyUsSection />
      <ValuesSection />
      <CompletedProjectsSection />
      <UpcomingProjectsSection />
      <TestimonialsSection />
      <MarqueeSection />
    </>
  )
}
