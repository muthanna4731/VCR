/**
 * Mock data for VCR Builders property browser.
 * Replace with Supabase queries when backend is wired up.
 */

export const cities = [
  { id: 'city-1', name: 'Mysore', state: 'Karnataka', sortOrder: 0 },
  { id: 'city-2', name: 'Hunsur', state: 'Karnataka', sortOrder: 1 },
  { id: 'city-3', name: 'Bangalore', state: 'Karnataka', sortOrder: 2 },
]

export const siteLayouts = [
  {
    id: 'layout-1',
    cityId: 'city-1',
    name: 'Hunsur Icon City',
    slug: 'hunsur-icon-city',
    description: 'Premium gated community with 100% Vastu-compliant plots in a prime Mysore location.',
    layoutImageUrl: null,
    address: 'Mysore Ring Road, Mysore',
    totalPlots: 45,
    isPublished: true,
  },
  {
    id: 'layout-2',
    cityId: 'city-1',
    name: 'Kapila Weekend Villa',
    slug: 'kapila-weekend-villa',
    description: 'Weekend getaway plots surrounded by nature, just 20 minutes from Mysore city.',
    layoutImageUrl: null,
    address: 'Nanjangud Road, Mysore',
    totalPlots: 20,
    isPublished: true,
  },
  {
    id: 'layout-3',
    cityId: 'city-2',
    name: 'VCR Green Valley',
    slug: 'vcr-green-valley',
    description: 'Spacious plots in a serene setting with wide roads and modern amenities.',
    layoutImageUrl: null,
    address: 'Hunsur Main Road, Hunsur',
    totalPlots: 32,
    isPublished: true,
  },
  {
    id: 'layout-4',
    cityId: 'city-3',
    name: 'Hosa City',
    slug: 'hosa-city',
    description: 'Urban plots with excellent connectivity to Bangalore IT corridor.',
    layoutImageUrl: null,
    address: 'Hosur Road, Bangalore',
    totalPlots: 60,
    isPublished: true,
  },
]

/** @type {Array<{id: string, layoutId: string, plotNumber: string, dimensions: string, dimensionSqft: number, facing: string, status: string, pricePerSqft: number, totalPrice: number, cornerPlot: boolean, roadWidth: string, amenities: string[]}>} */
export const plots = [
  // === Hunsur Icon City (layout-1) — 45 plots ===
  { id: 'p-1-1', layoutId: 'layout-1', plotNumber: 'A-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'available', pricePerSqft: 2500, totalPrice: 6000000, cornerPlot: true, roadWidth: '30ft', amenities: ['park_facing', 'main_road'] },
  { id: 'p-1-2', layoutId: 'layout-1', plotNumber: 'A-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'available', pricePerSqft: 2200, totalPrice: 2640000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-3', layoutId: 'layout-1', plotNumber: 'A-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'negotiation', pricePerSqft: 2200, totalPrice: 2640000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-4', layoutId: 'layout-1', plotNumber: 'A-4', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'sold', pricePerSqft: 2500, totalPrice: 6000000, cornerPlot: false, roadWidth: '30ft', amenities: ['park_facing'] },
  { id: 'p-1-5', layoutId: 'layout-1', plotNumber: 'A-5', dimensions: '50x80', dimensionSqft: 4000, facing: 'North', status: 'available', pricePerSqft: 2800, totalPrice: 11200000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road'] },
  { id: 'p-1-6', layoutId: 'layout-1', plotNumber: 'B-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'East', status: 'available', pricePerSqft: 2400, totalPrice: 5760000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-7', layoutId: 'layout-1', plotNumber: 'B-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'East', status: 'sold', pricePerSqft: 2100, totalPrice: 2520000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-8', layoutId: 'layout-1', plotNumber: 'B-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'East', status: 'available', pricePerSqft: 2100, totalPrice: 2520000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-9', layoutId: 'layout-1', plotNumber: 'B-4', dimensions: '40x60', dimensionSqft: 2400, facing: 'East', status: 'negotiation', pricePerSqft: 2400, totalPrice: 5760000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road'] },
  { id: 'p-1-10', layoutId: 'layout-1', plotNumber: 'C-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'South', status: 'available', pricePerSqft: 2300, totalPrice: 5520000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-11', layoutId: 'layout-1', plotNumber: 'C-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'South', status: 'available', pricePerSqft: 2000, totalPrice: 2400000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-1-12', layoutId: 'layout-1', plotNumber: 'C-3', dimensions: '50x80', dimensionSqft: 4000, facing: 'South', status: 'blocked', pricePerSqft: 2600, totalPrice: 10400000, cornerPlot: false, roadWidth: '40ft', amenities: ['park_facing'] },
  { id: 'p-1-13', layoutId: 'layout-1', plotNumber: 'D-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'West', status: 'available', pricePerSqft: 2200, totalPrice: 5280000, cornerPlot: true, roadWidth: '30ft', amenities: ['main_road'] },
  { id: 'p-1-14', layoutId: 'layout-1', plotNumber: 'D-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'West', status: 'sold', pricePerSqft: 1900, totalPrice: 2280000, cornerPlot: false, roadWidth: '30ft', amenities: [] },

  // === Kapila Weekend Villa (layout-2) — 20 plots ===
  { id: 'p-2-1', layoutId: 'layout-2', plotNumber: 'A-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'available', pricePerSqft: 1800, totalPrice: 4320000, cornerPlot: true, roadWidth: '30ft', amenities: ['park_facing'] },
  { id: 'p-2-2', layoutId: 'layout-2', plotNumber: 'A-2', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'sold', pricePerSqft: 1800, totalPrice: 4320000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-2-3', layoutId: 'layout-2', plotNumber: 'A-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'available', pricePerSqft: 1600, totalPrice: 1920000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-2-4', layoutId: 'layout-2', plotNumber: 'B-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'East', status: 'negotiation', pricePerSqft: 1700, totalPrice: 4080000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-2-5', layoutId: 'layout-2', plotNumber: 'B-2', dimensions: '50x80', dimensionSqft: 4000, facing: 'East', status: 'available', pricePerSqft: 2000, totalPrice: 8000000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road'] },
  { id: 'p-2-6', layoutId: 'layout-2', plotNumber: 'C-1', dimensions: '30x40', dimensionSqft: 1200, facing: 'South', status: 'available', pricePerSqft: 1500, totalPrice: 1800000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-2-7', layoutId: 'layout-2', plotNumber: 'C-2', dimensions: '40x60', dimensionSqft: 2400, facing: 'South', status: 'sold', pricePerSqft: 1700, totalPrice: 4080000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-2-8', layoutId: 'layout-2', plotNumber: 'D-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'West', status: 'available', pricePerSqft: 1600, totalPrice: 3840000, cornerPlot: false, roadWidth: '30ft', amenities: [] },

  // === VCR Green Valley (layout-3) — 32 plots ===
  { id: 'p-3-1', layoutId: 'layout-3', plotNumber: 'A-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'available', pricePerSqft: 1500, totalPrice: 3600000, cornerPlot: true, roadWidth: '30ft', amenities: ['park_facing', 'main_road'] },
  { id: 'p-3-2', layoutId: 'layout-3', plotNumber: 'A-2', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'available', pricePerSqft: 1500, totalPrice: 3600000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-3', layoutId: 'layout-3', plotNumber: 'A-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'negotiation', pricePerSqft: 1300, totalPrice: 1560000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-4', layoutId: 'layout-3', plotNumber: 'B-1', dimensions: '50x80', dimensionSqft: 4000, facing: 'East', status: 'available', pricePerSqft: 1700, totalPrice: 6800000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road'] },
  { id: 'p-3-5', layoutId: 'layout-3', plotNumber: 'B-2', dimensions: '40x60', dimensionSqft: 2400, facing: 'East', status: 'sold', pricePerSqft: 1400, totalPrice: 3360000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-6', layoutId: 'layout-3', plotNumber: 'B-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'East', status: 'available', pricePerSqft: 1200, totalPrice: 1440000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-7', layoutId: 'layout-3', plotNumber: 'C-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'South', status: 'available', pricePerSqft: 1400, totalPrice: 3360000, cornerPlot: false, roadWidth: '30ft', amenities: ['park_facing'] },
  { id: 'p-3-8', layoutId: 'layout-3', plotNumber: 'C-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'South', status: 'available', pricePerSqft: 1200, totalPrice: 1440000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-9', layoutId: 'layout-3', plotNumber: 'D-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'West', status: 'sold', pricePerSqft: 1300, totalPrice: 3120000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-3-10', layoutId: 'layout-3', plotNumber: 'D-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'West', status: 'available', pricePerSqft: 1100, totalPrice: 1320000, cornerPlot: false, roadWidth: '30ft', amenities: [] },

  // === Hosa City (layout-4) — 60 plots ===
  { id: 'p-4-1', layoutId: 'layout-4', plotNumber: 'A-1', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'sold', pricePerSqft: 3500, totalPrice: 4200000, cornerPlot: true, roadWidth: '30ft', amenities: ['main_road'] },
  { id: 'p-4-2', layoutId: 'layout-4', plotNumber: 'A-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'North', status: 'sold', pricePerSqft: 3200, totalPrice: 3840000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-3', layoutId: 'layout-4', plotNumber: 'A-3', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'available', pricePerSqft: 3800, totalPrice: 9120000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-4', layoutId: 'layout-4', plotNumber: 'A-4', dimensions: '40x60', dimensionSqft: 2400, facing: 'North', status: 'negotiation', pricePerSqft: 3800, totalPrice: 9120000, cornerPlot: true, roadWidth: '40ft', amenities: ['park_facing'] },
  { id: 'p-4-5', layoutId: 'layout-4', plotNumber: 'B-1', dimensions: '30x40', dimensionSqft: 1200, facing: 'East', status: 'available', pricePerSqft: 3000, totalPrice: 3600000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-6', layoutId: 'layout-4', plotNumber: 'B-2', dimensions: '50x80', dimensionSqft: 4000, facing: 'East', status: 'available', pricePerSqft: 4000, totalPrice: 16000000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road', 'park_facing'] },
  { id: 'p-4-7', layoutId: 'layout-4', plotNumber: 'B-3', dimensions: '30x40', dimensionSqft: 1200, facing: 'East', status: 'sold', pricePerSqft: 3000, totalPrice: 3600000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-8', layoutId: 'layout-4', plotNumber: 'C-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'South', status: 'available', pricePerSqft: 3500, totalPrice: 8400000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-9', layoutId: 'layout-4', plotNumber: 'C-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'South', status: 'negotiation', pricePerSqft: 2800, totalPrice: 3360000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
  { id: 'p-4-10', layoutId: 'layout-4', plotNumber: 'D-1', dimensions: '40x60', dimensionSqft: 2400, facing: 'West', status: 'available', pricePerSqft: 3200, totalPrice: 7680000, cornerPlot: true, roadWidth: '40ft', amenities: ['main_road'] },
  { id: 'p-4-11', layoutId: 'layout-4', plotNumber: 'D-2', dimensions: '30x40', dimensionSqft: 1200, facing: 'West', status: 'sold', pricePerSqft: 2800, totalPrice: 3360000, cornerPlot: false, roadWidth: '30ft', amenities: [] },
]

// --- Helper functions ---

export function getCityById(cityId) {
  return cities.find(c => c.id === cityId)
}

export function getLayoutsByCity(cityId) {
  return siteLayouts.filter(l => l.cityId === cityId && l.isPublished)
}

export function getLayoutBySlug(slug) {
  return siteLayouts.find(l => l.slug === slug)
}

export function getPlotsByLayout(layoutId) {
  return plots.filter(p => p.layoutId === layoutId)
}

export function getLayoutStats(layoutId) {
  const layoutPlots = getPlotsByLayout(layoutId)
  const available = layoutPlots.filter(p => p.status === 'available').length
  const minPrice = layoutPlots.length > 0
    ? Math.min(...layoutPlots.map(p => p.pricePerSqft))
    : 0
  return { total: layoutPlots.length, available, minPrice }
}

export function getUniqueFacings(layoutId) {
  const layoutPlots = getPlotsByLayout(layoutId)
  return [...new Set(layoutPlots.map(p => p.facing))].sort()
}

export function getUniqueDimensions(layoutId) {
  const layoutPlots = getPlotsByLayout(layoutId)
  return [...new Set(layoutPlots.map(p => p.dimensions))].sort()
}

export function formatPrice(amount) {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)} L`
  }
  return amount.toLocaleString('en-IN')
}

export function formatPricePerSqft(price) {
  return `${price.toLocaleString('en-IN')}/sqft`
}

export const STATUS_COLORS = {
  available: '#34c759',
  negotiation: '#ffcc00',
  booked: '#007aff',
  sold: '#ff3b30',
  blocked: '#8e8e93',
}

export const STATUS_LABELS = {
  available: 'Available',
  negotiation: 'In Negotiation',
  booked: 'Booked',
  sold: 'Sold',
  blocked: 'Blocked',
}

export const AMENITY_LABELS = {
  park_facing: 'Park Facing',
  main_road: 'Main Road',
}
