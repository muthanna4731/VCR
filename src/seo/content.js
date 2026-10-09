// Single source of truth for public-facing SEO / AEO content.
//
// Imported by the React pages (browser) AND by scripts/prerender.mjs (Node),
// so keep this file plain data: no image imports, no JSX, no browser APIs.
//
// Content blocks used in `sections[].body`:
//   { p: 'text' } | { ul: ['…'] } | { ol: ['…'] } | { table: { head: [], rows: [[]] } }

const viteEnv = import.meta.env || {}
const nodeEnv = typeof process !== 'undefined' ? process.env : {}

export const SITE_URL = (viteEnv.VITE_SITE_URL || nodeEnv.VITE_SITE_URL || nodeEnv.SITE_URL || 'https://vcr-three.vercel.app').replace(/\/+$/, '')

// Last date the market numbers below were checked. Update when refreshing prices.
export const CONTENT_UPDATED = '2026-10-09'
export const CONTENT_UPDATED_LABEL = 'October 2026'

// ─── Business facts (NAP) ───────────────────────────────────────────────────
// Keep these identical everywhere: website, Google Business Profile, Justdial,
// Facebook, Instagram, 99acres, K-RERA. AI assistants trust consistent facts.
export const BUSINESS = {
  name: 'VCR Builders and Developers',
  alternateNames: ['VCR Developers', 'VCR Builders & Developers', 'VCR Builders'],
  shortDescription:
    'VCR Builders and Developers is a Mysuru-based real estate developer of gated, Vastu-compliant residential plot layouts and managed farm land in Srirangapatna, Hunsur, Nanjangud, KRS and H.D. Kote, Karnataka.',
  founder: {
    name: 'V. C. Ravikumar',
    jobTitle: 'Managing Director',
    affiliations: ['NAREDCO Mysuru Chapter (President)', 'Lions Club Mysore (Regional Head)', 'BAI Mysore Centre'],
  },
  phone: '+91 98860 48471',
  phoneE164: '+919886048471',
  email: 'vcrdevelopers@gmail.com',
  address: {
    locality: 'Jayalakshmipuram',
    city: 'Mysuru',
    region: 'Karnataka',
    postalCode: '570012',
    country: 'IN',
    display: 'Jayalakshmipuram, Mysuru, Karnataka 570012',
  },
  areaServed: ['Mysuru', 'Srirangapatna', 'Hunsur', 'Nanjangud', 'Krishnarajasagara (KRS)', 'H.D. Kote', 'Mandya district'],
  sameAs: [
    'https://www.facebook.com/p/VCR-Builders-Developers-61577202737293/',
    'https://www.instagram.com/vcrdevelopers/',
  ],
  services: [
    'Residential plot layouts',
    'Gated community plots',
    'Managed farm land',
    'Independent house construction',
    'Layout civil works and land development',
  ],
}

// ─── Projects ───────────────────────────────────────────────────────────────
// `slug` matches site_layouts.slug in Supabase for layouts that have a live
// plot map. Prerender enriches these with live plot counts and prices.
export const PROJECTS = [
  {
    name: 'Kapilla Weekend Villa',
    slug: 'kapilla-weekend-villa',
    area: 'nanjangud',
    location: 'Nanjangud Road, near Mysuru',
    status: 'Selling now',
    summary:
      'A gated community of managed farm land and weekend-home plots on Nanjangud Road, about 20 minutes from Mysuru city. "A piece of land in a land of peace."',
  },
  {
    name: 'Devagiri Enclave',
    slug: 'devagiri-enclave',
    area: 'hunsur',
    location: 'Hunsur, Mysuru district',
    status: 'Selling now',
    summary: 'A plotted residential layout in Hunsur town with a wide range of plot sizes, from compact budget sites upward.',
  },
  {
    name: 'RM Layout',
    slug: 'rm-layout',
    area: 'hd-kote',
    location: 'H.D. Kote, Mysuru district',
    status: 'Selling now',
    summary: 'A premium gated plotted community in H.D. Kote.',
  },
  {
    name: 'VCR Riverview Garden',
    area: 'srirangapatna',
    location: 'Srirangapatna, Mandya district',
    acres: 12,
    status: 'Ongoing',
    summary:
      'A 12-acre gated layout in Srirangapatna (also known as VCR River View Gardenia) where VCR is also building independent homes for plot owners.',
  },
  {
    name: 'VCR Ambhabhavi Nagara',
    area: 'hunsur',
    location: 'Hunsur, Mysuru district',
    acres: 11,
    status: 'Upcoming',
    summary: 'An 11-acre residential layout in Hunsur.',
  },
  {
    name: 'VCR Bhoovaraha',
    area: 'krs',
    location: 'KRS (Krishnarajasagara), near Mysuru',
    acres: 8,
    status: 'Upcoming',
    summary: 'An 8-acre layout near the KRS dam and Brindavan Gardens belt.',
  },
  {
    name: 'VCR Nanjundeshwara Township',
    area: 'nanjangud',
    location: 'Nanjangud, Mysuru district',
    acres: 23,
    status: 'Upcoming',
    summary: 'A 23-acre township in Nanjangud — VCR\'s largest planned project.',
  },
]

// ─── Paperwork (rendered on /paperwork) ─────────────────────────────────────
export const PAPERWORK = [
  {
    title: 'RERA Registration',
    desc: 'All VCR layouts are registered under the Real Estate (Regulation and Development) Act, 2016. Registration numbers are available on request and verifiable on the Karnataka RERA portal.',
  },
  {
    title: 'Title Deed & Ownership',
    desc: 'Clear and marketable title deeds are maintained for every layout. Buyers receive a certified copy of the title deed at the time of registration.',
  },
  {
    title: 'Layout Approval',
    desc: 'All layouts hold valid approvals from the respective local bodies — BDA, MUDA, or panchayat — before plots are offered for sale.',
  },
  {
    title: 'Encumbrance Certificate',
    desc: 'An encumbrance certificate (EC) confirming the property is free from any legal dues or mortgages is provided to every buyer during the sale process.',
  },
  {
    title: 'Khata & Tax Documents',
    desc: 'Khata transfer and property tax documents are facilitated by VCR post-registration. Our team assists buyers through every step of the mutation process.',
  },
  {
    title: 'Sale Agreement',
    desc: 'A comprehensive sale agreement is executed before the final registration. The agreement covers payment schedule, possession timeline, and plot specifications.',
  },
]

// ─── Reused market facts ────────────────────────────────────────────────────
const SOURCES = {
  sobha: { label: 'Sobha — Residential Plots in Mysore 2026 buyer\'s guide', url: 'https://www.sobha.com/blog/residential-plots-in-mysore-buyers-guide/' },
  prestige: { label: 'Prestige Pavilion — Mysuru land vs apartment rates 2026', url: 'https://www.prestigespavilion.com/mysuru/mysuru-land-rates-vs-apartment-rates-which-is-the-smarter-buy-in-2026.html' },
  squareyards: { label: 'Square Yards — Property rates in Mysore', url: 'https://www.squareyards.com/property-rates-in-mysore' },
  prr: { label: 'Star of Mysore — 105-km Peripheral Ring Road to begin by late 2026', url: 'https://starofmysore.com/peripheral-ring-road-encircling-mysuru-city-105-km-project-to-begin-by-late-2026/' },
  mdaAct: { label: 'Karnataka Act 39 of 2025 — Mysuru Development Authority Act (PRS India)', url: 'https://prsindia.org/files/bills_acts/acts_states/karnataka/2025/Act39of2025KA.pdf' },
  expressway: { label: 'Brigade Group — Bengaluru–Mysuru Expressway real estate impact', url: 'https://www.brigadegroup.com/blog/residential/bangalore-mysore-expressway-real-estate-impact' },
  rera: { label: 'Karnataka RERA portal', url: 'https://rera.karnataka.gov.in/' },
}

const PRICE_TABLE = {
  head: ['Micro-market', 'Indicative plot rate (₹ per sq ft)', 'Best for'],
  rows: [
    ['KRS Road', '8,200 – 10,600', 'Villas and independent houses; priciest corridor in the city'],
    ['Vijayanagar', '5,500 – 8,000', 'Self-built family homes inside the city'],
    ['Ring Road belt', '4,000 – 8,000', 'Future construction close to the city'],
    ['Hebbal', '4,500 – 7,050', 'Proximity to industrial and IT employers'],
    ['Bogadi', '3,400 – 6,500', 'Established residential neighbourhoods on the west side'],
    ['Bannur Road', '2,950 – 6,000', 'Entry-level land ownership'],
    ['Hunsur Road', '3,500 – 5,000', 'Western growth corridor; up 30–40% in about three years'],
    ['Nanjangud', '3,000 – 4,000', 'First-time land buyers on a budget'],
  ],
}

const LEGAL_CHECKLIST = [
  'Approving authority and approval number — ask which body sanctioned the layout (Mysuru Development Authority, a local planning authority, or DC conversion plus town/panchayat approval) and verify the order number with that office.',
  'DC conversion order — agricultural land must be officially converted before a house can legally be built on it.',
  'Title chain — the mother deed and every sale deed for at least 20–30 years, with matching survey numbers across all documents.',
  'RTC (Bhoomi) and mutation records — confirm ownership entries and land classification match the seller.',
  'Encumbrance Certificate (EC) for 30 years — shows mortgages, loans or claims against the survey number.',
  'Khata / e-Khata — confirm the type of Khata the plot will receive after registration.',
  'K-RERA registration — layouts above 500 sq m or more than 8 plots must be registered; check the number on rera.karnataka.gov.in.',
  'Bank-loan eligibility — a bank that will lend against the plot is a useful independent check of the paperwork.',
  'Physical survey — walk the site with a licensed surveyor to confirm boundaries, road width and dimensions.',
]

// ─── Mysore plots guide (/mysore-plots-guide) ───────────────────────────────
export const GUIDE = {
  path: '/mysore-plots-guide',
  title: 'Buying a Plot in Mysuru (Mysore) in 2026: Prices, Best Areas & Legal Checklist',
  metaTitle: 'Mysore Plot Prices 2026, Best Areas & Legal Checklist | VCR',
  description:
    'Mysuru plot prices by area in 2026 (KRS Road, Hunsur Road, Bannur Road, Nanjangud and more), what is driving land demand, MDA/MUDA approval rules and a 9-point legal checklist.',
  intro: [
    'Mysuru (Mysore) is one of Karnataka\'s fastest-moving land markets. Plotted land costs a fraction of Bengaluru, the Bengaluru–Mysuru Expressway has cut the drive between the two cities to roughly 75–90 minutes, and a 105-km Peripheral Ring Road is planned around the city.',
    'This guide is written by VCR Builders and Developers, a Mysuru-based plotted-layout developer with projects in Srirangapatna, Hunsur, Nanjangud, KRS and H.D. Kote. It summarises published price data, the approvals that matter, and the checks every buyer should run — whether or not you buy from us.',
  ],
  sections: [
    {
      id: 'prices',
      heading: 'How much does a plot cost in Mysuru in 2026?',
      body: [
        { p: 'Most residential plots around Mysuru are quoted between roughly ₹3,000 and ₹8,000 per sq ft in 2026. Prime corridors such as KRS Road reach ₹8,000–10,600 per sq ft, while towns 20–50 km out — Nanjangud, Hunsur, H.D. Kote — are where entry-level and weekend-land budgets still work.' },
        { table: PRICE_TABLE },
        { p: 'These are indicative ranges published by developers and property portals in mid-2026, not registered transaction values. Actual prices depend on approval type, road width, plot facing, corner location and distance from the Ring Road. For a specific survey number, check the government guidance value and recent registered sale deeds at the sub-registrar\'s office.' },
        { p: 'Across all property types, Square Yards puts Mysuru\'s average rate at about ₹7,450 per sq ft (June 2026), down from a peak of about ₹11,850 in September 2025 — so negotiate, and do not assume prices only move up.' },
      ],
      sources: [SOURCES.sobha, SOURCES.prestige, SOURCES.squareyards],
    },
    {
      id: 'drivers',
      heading: 'Why is land demand rising around Mysuru?',
      body: [
        { ul: [
          'Bengaluru–Mysuru Expressway (about 119 km, opened March 2023) — towns along it such as Srirangapatna and Mandya have seen land appreciation, and weekend-home demand from Bengaluru buyers has grown.',
          'Peripheral Ring Road — the Mysuru Development Authority (MDA) plans a 105.31-km, 45-metre, six-lane ring road with service roads around the city, with a township proposed along it. As of late 2026 it is at the DPR and land-acquisition stage, so treat timelines as uncertain.',
          'Western growth — as central Mysuru filled up, builders moved toward Hunsur Road, Bogadi and Huyilalu, where larger plots are still available.',
          'Price gap with Bengaluru — Mysuru property is commonly quoted 20–30% below comparable Bengaluru markets, which pulls in Bengaluru families, retirees and NRIs.',
          'Employment — IT and industrial employers (Infosys\' Mysuru campus, Hebbal and Hootagalli industrial areas) support steady housing demand.',
        ] },
      ],
      sources: [SOURCES.expressway, SOURCES.prr],
    },
    {
      id: 'approvals',
      heading: 'MUDA, MDA, DC conversion: which approval does a plot need?',
      body: [
        { p: 'In 2025 Karnataka replaced the Mysore Urban Development Authority (MUDA) with the Mysuru Development Authority (MDA). Inside its planning area, MDA approves layouts; older documents will still say "MUDA".' },
        { p: 'Outside the MDA planning area — in towns such as Srirangapatna, Hunsur, Nanjangud and H.D. Kote — layouts are approved through the local planning authority or town body, and the land must first be converted from agricultural to residential use (DC conversion). A "MUDA-approved" label on a plot far outside Mysuru city should be verified, not assumed.' },
        { p: 'Phrases like "MUDA compliant" or "near a MUDA layout" are not approvals. A genuine approval has an order number you can check with the issuing office.' },
      ],
      sources: [SOURCES.mdaAct],
    },
    {
      id: 'checklist',
      heading: 'Legal checklist before buying a plot in Mysuru',
      body: [{ ol: LEGAL_CHECKLIST }, { p: 'Have an independent property lawyer review the documents before you pay a token advance.' }],
      sources: [SOURCES.rera],
    },
    {
      id: 'areas',
      heading: 'Which area near Mysuru should you buy in?',
      body: [
        { ul: [
          'Building a home inside the city soon: Vijayanagar, Bogadi, Ring Road belt.',
          'Long-term appreciation on a mid budget: Hunsur Road and the western corridor.',
          'Weekend home or managed farm land: Nanjangud Road, KRS and Srirangapatna — river, dam and heritage surroundings within 20–30 minutes of the city.',
          'Lowest entry price: Nanjangud, Hunsur town and H.D. Kote.',
          'Bengaluru commuters: Srirangapatna, at the Mysuru end of the expressway.',
        ] },
      ],
    },
    {
      id: 'vcr',
      heading: 'Where VCR Builders and Developers fits in',
      body: [
        { p: 'VCR Builders and Developers was founded in Srirangapatna by V. C. Ravikumar, a civil contractor who has delivered 25+ independent homes and multiple residential layouts across Srirangapatna, Mysuru and Bengaluru. Every VCR project is a gated, Vastu-compliant layout, and VCR can also build your house once you own the plot.' },
        { p: 'Current projects: Kapilla Weekend Villa (Nanjangud Road), Devagiri Enclave (Hunsur), RM Layout (H.D. Kote), and upcoming VCR Riverview Garden (Srirangapatna, 12 acres), VCR Ambhabhavi Nagara (Hunsur, 11 acres), VCR Bhoovaraha (KRS, 8 acres) and VCR Nanjundeshwara Township (Nanjangud, 23 acres).' },
      ],
    },
  ],
}

// ─── Area pages ─────────────────────────────────────────────────────────────
export const AREAS = [
  {
    key: 'srirangapatna',
    path: '/plots-in-srirangapatna',
    place: 'Srirangapatna',
    title: 'Plots for Sale in Srirangapatna',
    metaTitle: 'Plots for Sale in Srirangapatna, near Mysore | VCR Builders',
    description:
      'Gated, Vastu-compliant residential plots in Srirangapatna by VCR Builders and Developers — a Srirangapatna-born developer. Prices, approvals and why Srirangapatna land is in demand.',
    intro: [
      'Srirangapatna is a heritage river-island town on the Kaveri, about 15 km from Mysuru, at the Mysuru end of the Bengaluru–Mysuru Expressway. Its mix of river frontage, temples and expressway access makes it popular for weekend homes, retirement homes and Bengaluru commuters.',
      'VCR Builders and Developers was founded in Srirangapatna, and its 12-acre VCR Riverview Garden layout is under development here, alongside independent homes VCR is building for plot owners.',
    ],
    market: [
      'Developed plots in Srirangapatna are commonly advertised from about ₹3,000–3,500 per sq ft in 2026. Published data for the town is thin, so compare asking prices with the guidance value and recent registered sales for the same village.',
      'Srirangapatna sits in Mandya district, outside the Mysuru Development Authority area. Check the layout\'s approval order from the competent local authority and the DC conversion order.',
    ],
    faq: [
      { q: 'Is Srirangapatna a good place to buy a plot?', a: 'For buyers who want river and heritage surroundings within 20 minutes of Mysuru and direct expressway access to Bengaluru, yes. Prices are still well below Mysuru city corridors such as KRS Road. Verify the approval and DC conversion of any layout before you buy.' },
      { q: 'Which developers have gated layouts in Srirangapatna?', a: 'VCR Builders and Developers is a Srirangapatna-founded developer building the 12-acre VCR Riverview Garden gated layout there, and it also constructs independent homes for plot owners in the layout.' },
    ],
  },
  {
    key: 'hunsur',
    path: '/plots-in-hunsur',
    place: 'Hunsur',
    title: 'Plots for Sale in Hunsur and on Hunsur Road',
    metaTitle: 'Plots for Sale in Hunsur & Hunsur Road, Mysore | VCR Builders',
    description:
      'Residential plots in Hunsur by VCR Builders and Developers — Devagiri Enclave and the upcoming 11-acre VCR Ambhabhavi Nagara. 2026 Hunsur Road plot prices and buying tips.',
    intro: [
      'Hunsur is a growing town about 45 km west of Mysuru on the Mysuru–Hunsur road, the corridor towards Kodagu (Coorg). Mysuru\'s western expansion — Bogadi, Huyilalu and Hunsur Road — has made this one of the city\'s strongest-appreciating belts.',
      'VCR Builders and Developers is selling plots in Devagiri Enclave in Hunsur and is planning VCR Ambhabhavi Nagara, an 11-acre layout in the same town.',
    ],
    market: [
      'Plots on Hunsur Road are quoted at about ₹3,500–5,000 per sq ft in 2026, and the corridor is reported to have risen 30–40% over roughly three years. Plots inside Hunsur town are typically cheaper than those closer to Mysuru.',
      'Hunsur is outside the Mysuru Development Authority planning area, so ask for the local layout approval and DC conversion order.',
    ],
    faq: [
      { q: 'What is the price of plots on Hunsur Road, Mysore?', a: 'Published 2026 ranges put Hunsur Road plots at about ₹3,500–5,000 per sq ft, with plots in Hunsur town usually lower. Approval type, road width and distance from Mysuru move the price most.' },
      { q: 'Which layouts are available in Hunsur?', a: 'VCR Builders and Developers has Devagiri Enclave, a plotted layout in Hunsur town with a wide range of plot sizes, and an upcoming 11-acre layout, VCR Ambhabhavi Nagara.' },
    ],
  },
  {
    key: 'nanjangud',
    path: '/plots-in-nanjangud',
    place: 'Nanjangud',
    title: 'Plots and Managed Farm Land on Nanjangud Road',
    metaTitle: 'Plots & Farm Land in Nanjangud, Mysore | VCR Builders',
    description:
      'Kapilla Weekend Villa — gated managed farm land on Nanjangud Road, about 20 minutes from Mysuru — and the upcoming 23-acre VCR Nanjundeshwara Township. Nanjangud plot prices for 2026.',
    intro: [
      'Nanjangud is a temple town on the Kapila river about 25 km south of Mysuru on the Mysuru–Ooty highway, with an established industrial area. It is one of the most affordable land markets within half an hour of the city.',
      'VCR Builders and Developers\' Kapilla Weekend Villa is a gated community of managed farm land and weekend-home plots on Nanjangud Road, and the 23-acre VCR Nanjundeshwara Township is planned in Nanjangud.',
    ],
    market: [
      'Nanjangud plots are quoted at about ₹3,000–4,000 per sq ft in 2026, and analysts expect further gains if the proposed Film City project near Mysuru takes shape. Kapilla Weekend Villa plots have been listed from about ₹2,000–2,500 per sq ft (October 2026) — check the live plot map for current availability.',
      'For farm land, confirm whether you are buying agricultural land (with any restrictions on who can buy it) or a converted residential plot.',
    ],
    faq: [
      { q: 'What is Kapilla Weekend Villa?', a: 'Kapilla Weekend Villa is a gated community of managed farm land and weekend-home plots by VCR Builders and Developers on Nanjangud Road, about 20 minutes from Mysuru city. Plot sizes start at about 1,200 sq ft, with larger farm-land plots available.' },
      { q: 'How much does land cost in Nanjangud?', a: 'Published 2026 ranges put Nanjangud plots at about ₹3,000–4,000 per sq ft. Managed farm-land plots further from the town can be lower; Kapilla Weekend Villa has been listed from about ₹2,000 per sq ft.' },
    ],
  },
  {
    key: 'krs',
    path: '/plots-near-krs',
    place: 'KRS',
    title: 'Plots near KRS Dam and KRS Road, Mysore',
    metaTitle: 'Plots near KRS Road & KRS Dam, Mysore | VCR Builders',
    description:
      'VCR Bhoovaraha — an upcoming 8-acre layout near KRS (Krishnarajasagara) by VCR Builders and Developers. KRS Road plot prices in 2026 and what to check before buying.',
    intro: [
      'KRS Road runs north-west from Mysuru towards the Krishnarajasagara (KRS) dam and Brindavan Gardens, about 20 km from the city, and links towards Srirangapatna. It is Mysuru\'s premium villa belt.',
      'VCR Builders and Developers is planning VCR Bhoovaraha, an 8-acre layout near KRS.',
    ],
    market: [
      'KRS Road commands the highest plot prices in Mysuru — about ₹8,200–10,600 per sq ft in 2026 for city-side stretches. Plots further out towards the dam are priced lower.',
      'Land close to the reservoir can carry extra restrictions; confirm the zoning and approval for the exact survey number.',
    ],
    faq: [
      { q: 'What is the price of plots on KRS Road, Mysore?', a: 'KRS Road is Mysuru\'s most expensive plot corridor, with published 2026 rates of about ₹8,200–10,600 per sq ft for city-side stretches; prices fall further out towards the KRS dam.' },
    ],
  },
  {
    key: 'hd-kote',
    path: '/plots-in-hd-kote',
    place: 'H.D. Kote',
    title: 'Plots for Sale in H.D. Kote',
    metaTitle: 'Plots for Sale in H.D. Kote (Heggadadevanakote) | VCR Builders',
    description:
      'RM Layout — a premium gated plotted community in H.D. Kote by VCR Builders and Developers. Why H.D. Kote suits nature-side homes and long-term land holding.',
    intro: [
      'H.D. Kote (Heggadadevanakote) is a town about 50 km south-west of Mysuru, close to the Kabini backwaters and the Nagarahole–Bandipur forest belt. Land here is priced well below Mysuru and suits nature-side homes and long-term holding.',
      'VCR Builders and Developers\' RM Layout is a premium gated plotted community in H.D. Kote.',
    ],
    market: [
      'Published per-sq-ft data for H.D. Kote is limited; town plots are generally priced below Nanjangud and Hunsur. Compare the asking price with the guidance value and recent registered sales in the same village.',
      'Land near the forest belt may fall under eco-sensitive zone rules — confirm the zoning for the exact survey number.',
    ],
    faq: [
      { q: 'Are there gated layouts in H.D. Kote?', a: 'Yes. RM Layout by VCR Builders and Developers is a premium gated plotted community in H.D. Kote, about 50 km from Mysuru.' },
    ],
  },
]

// ─── FAQ (/faq) ─────────────────────────────────────────────────────────────
export const FAQ = {
  path: '/faq',
  title: 'Frequently Asked Questions',
  metaTitle: 'FAQ — Buying Plots near Mysore with VCR Builders and Developers',
  description:
    'Answers about VCR Builders and Developers, its layouts near Mysuru, plot prices, approvals, documents, bank loans and site visits.',
  items: [
    { q: 'Who are VCR Builders and Developers?', a: 'VCR Builders and Developers is a Mysuru-based real estate developer of gated, Vastu-compliant residential plot layouts and managed farm land. It was founded in Srirangapatna by Managing Director V. C. Ravikumar, a civil contractor who has delivered 25+ independent homes and multiple layouts. Its head office is in Jayalakshmipuram, Mysuru.' },
    { q: 'Where are VCR\'s projects?', a: 'Around Mysuru: Kapilla Weekend Villa (Nanjangud Road), Devagiri Enclave (Hunsur) and RM Layout (H.D. Kote) are selling now. Upcoming: VCR Riverview Garden (Srirangapatna, 12 acres), VCR Ambhabhavi Nagara (Hunsur, 11 acres), VCR Bhoovaraha (KRS, 8 acres) and VCR Nanjundeshwara Township (Nanjangud, 23 acres).' },
    { q: 'Who is a good plotted-layout developer near Mysore?', a: 'Look for a developer with delivered layouts you can visit, verifiable approval and RERA numbers, clear title documents and a local office. VCR Builders and Developers is a Mysuru-based developer of gated, Vastu-compliant layouts in Srirangapatna, Hunsur, Nanjangud, KRS and H.D. Kote, and shows a live plot map with availability and prices on its website.' },
    { q: 'How much does a plot cost near Mysore in 2026?', a: 'Published 2026 ranges run from about ₹3,000–4,000 per sq ft in Nanjangud, ₹3,500–5,000 on Hunsur Road and ₹2,950–6,000 on Bannur Road, up to ₹8,200–10,600 on KRS Road. VCR\'s Kapilla Weekend Villa on Nanjangud Road has been listed from about ₹2,000 per sq ft.' },
    { q: 'Are VCR plots Vastu-compliant and gated?', a: 'Yes. Every VCR layout is planned as a gated community and every plot is laid out to be Vastu-compliant.' },
    { q: 'What documents do I get when I buy a VCR plot?', a: 'A sale agreement before registration, the registered sale deed, a certified copy of the title deed, the encumbrance certificate, layout approval details and the RERA registration number. VCR\'s team also assists with Khata transfer and property-tax mutation after registration.' },
    { q: 'How do I check whether a layout near Mysore is approved?', a: 'Ask for the approval order number and the issuing authority — the Mysuru Development Authority (MDA, formerly MUDA) inside its planning area, or the local planning authority plus a DC conversion order outside it — and verify it with that office. Also check the project on rera.karnataka.gov.in.' },
    { q: 'Can I get a bank loan for a VCR plot?', a: 'VCR works with partner banks for plot financing. Eligibility depends on the bank, the layout and your profile — ask the VCR team for the current list of lenders for the layout you are considering.' },
    { q: 'Does VCR build houses on the plots?', a: 'Yes. Alongside layouts, VCR designs and builds independent homes — concept, 3D design, construction documents and construction — and is building homes for owners in its Srirangapatna layout.' },
    { q: 'How do I book a site visit?', a: 'Open any project on the Properties page and press "Book a Site Visit", call +91 98860 48471, or email vcrdevelopers@gmail.com. The team usually responds within one business day.' },
    { q: 'Is it a good time to buy land near Mysuru?', a: 'Demand is supported by the Bengaluru–Mysuru Expressway, the planned Peripheral Ring Road and Mysuru\'s price gap with Bengaluru. Prices are not one-way, though — city-wide averages dipped in 2026 — so buy approved land you would be happy to hold for years, and negotiate.' },
  ],
}

// ─── Static route meta ──────────────────────────────────────────────────────
export const ROUTES = {
  '/': {
    title: 'VCR Builders and Developers | Gated Plots near Mysore — Srirangapatna, Hunsur, Nanjangud',
    description:
      'Mysuru-based developer of gated, Vastu-compliant residential plot layouts and managed farm land in Srirangapatna, Hunsur, Nanjangud, KRS and H.D. Kote. View live plot maps and book a site visit.',
  },
  '/properties': {
    title: 'Plots for Sale near Mysore — Live Plot Maps | VCR Builders and Developers',
    description:
      'Browse VCR layouts near Mysuru with live plot maps: plot sizes, facing, availability and price per sq ft. Kapilla Weekend Villa, Devagiri Enclave, RM Layout and more.',
  },
  '/about': {
    title: 'About VCR Builders and Developers & MD V. C. Ravikumar | Mysuru',
    description:
      'The story of V. C. Ravikumar — from a farming family in Srirangapatna taluk to founding VCR Builders and Developers, President of NAREDCO Mysuru Chapter, builder of 25+ homes and multiple layouts.',
  },
  '/paperwork': {
    title: 'Plot Documents & Legal Paperwork | VCR Builders and Developers',
    description:
      'The documents every VCR plot buyer receives: RERA registration, title deed, layout approval, encumbrance certificate, Khata and sale agreement.',
  },
  '/contact': {
    title: 'Contact VCR Builders and Developers | Mysuru Head Office',
    description:
      'Call +91 98860 48471 or email vcrdevelopers@gmail.com. Head office: Jayalakshmipuram, Mysuru 570012. Enquire about plots or book a site visit.',
  },
  [GUIDE.path]: { title: GUIDE.metaTitle, description: GUIDE.description },
  [FAQ.path]: { title: FAQ.metaTitle, description: FAQ.description },
  ...Object.fromEntries(AREAS.map(a => [a.path, { title: a.metaTitle, description: a.description }])),
}

export function getRouteMeta(pathname) {
  const clean = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'
  return ROUTES[clean] || null
}

export function projectsForArea(areaKey) {
  return PROJECTS.filter(p => p.area === areaKey)
}
