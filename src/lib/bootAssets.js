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

const BOOT_IMAGE_SOURCES = [
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

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()

    const finish = () => resolve(src)

    img.onload = finish
    img.onerror = finish
    img.decoding = 'async'
    img.fetchPriority = 'high'
    img.src = src

    if (img.complete) {
      finish()
    }
  })
}

export async function preloadBootAssets({ timeoutMs = 3000 } = {}) {
  const preloadWork = Promise.allSettled(BOOT_IMAGE_SOURCES.map(preloadImage))
  const timeoutWork = new Promise((resolve) => window.setTimeout(resolve, timeoutMs))

  await Promise.race([preloadWork, timeoutWork])
}

