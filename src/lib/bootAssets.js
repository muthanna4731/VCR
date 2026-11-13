import backImg from '../images/back.webp'
import houseImg from '../images/house-optimized.webp'
import vcrLogo from '../images/VCR Logo-optimized.webp'
import feature3Img from '../images/feature-3-optimized.webp'
import buyImg from '../images/buy.webp'
import sellImg from '../images/sell.webp'
import rentImg from '../images/rent.webp'
import mortgageImg from '../images/mortgage-services.webp'
import propertyMgmtImg from '../images/property-management.webp'
import developmentImg from '../images/development.webp'
import mdProfileImg from '../images/MD-Profile.webp'
import smokeImg from '../images/smoke.webp'

// What the hero paints on the first screen.
export const HERO_IMAGE_SOURCES = [backImg, houseImg, smokeImg, vcrLogo]

// Everything else the home page shows. The intro counter (IntroLoader) waits
// on these so nothing pops in after the reveal.
//
// These used to be awaited in main.jsx before React rendered at all, on every
// route, holding /properties, /admin etc. back up to 3 s for home-page images.
export const BOOT_IMAGE_SOURCES = [
  backImg,
  houseImg,
  vcrLogo,
  feature3Img,
  buyImg,
  sellImg,
  rentImg,
  mortgageImg,
  propertyMgmtImg,
  developmentImg,
  mdProfileImg,
]
