// Post-build step: turns the client-rendered SPA into crawlable pages.
//
// AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot) do not run
// JavaScript, so without this they only see an empty spinner. For every public
// route this writes dist/<route>.html containing:
//   - route-specific <title>, description, canonical, Open Graph tags
//   - schema.org JSON-LD (business, projects, FAQ, breadcrumbs, article)
//   - the page's text content inside #root, covered by the boot spinner and
//     replaced by React on mount
// It also writes sitemap-index.xml + sitemap-0.xml (and sitemap.xml), robots.txt, llms.txt, llms-full.txt and app.html
// (a noindex shell that vercel.json serves for every non-prerendered route).
//
// Run: vite build && node scripts/prerender.mjs

import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { resolveSiteUrl, isFallbackSiteUrl } from './site-url.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

const env = { ...loadEnv('production', ROOT, ''), ...process.env }
process.env.VITE_SITE_URL = resolveSiteUrl(env)

const {
  SITE_URL, BUSINESS, PROJECTS, PAPERWORK, GUIDE, AREAS, FAQ, ROUTES,
  CONTENT_UPDATED, CONTENT_UPDATED_LABEL, projectsForArea,
} = await import('../src/seo/content.js')

if (isFallbackSiteUrl(SITE_URL)) {
  console.log(`[prerender] No SITE_URL set — using the default live domain ${SITE_URL}.`)
}

// ─── helpers ────────────────────────────────────────────────────────────────

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const abs = (p) => `${SITE_URL}${p === '/' ? '/' : p}`
const inr = (n) => Number(n).toLocaleString('en-IN')
const ORG_ID = `${SITE_URL}/#organization`
const SITE_ID = `${SITE_URL}/#website`
const DEFAULT_IMAGE = `${SITE_URL}/pwa-icon-512.png`

function blocksToHtml(blocks) {
  return blocks.map((b) => {
    if (b.p) return `<p>${esc(b.p)}</p>`
    if (b.ul) return `<ul>${b.ul.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    if (b.ol) return `<ol>${b.ol.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`
    if (b.table) {
      const head = b.table.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')
      const rows = b.table.rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
      return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
    }
    return ''
  }).join('\n')
}

function blocksToText(blocks) {
  return blocks.map((b) => {
    if (b.p) return b.p
    if (b.ul) return b.ul.map(i => `- ${i}`).join('\n')
    if (b.ol) return b.ol.map((i, n) => `${n + 1}. ${i}`).join('\n')
    if (b.table) {
      const line = (cells) => `| ${cells.join(' | ')} |`
      return [line(b.table.head), line(b.table.head.map(() => '---')), ...b.table.rows.map(line)].join('\n')
    }
    return ''
  }).join('\n\n')
}

const sourcesHtml = (sources) => sources?.length
  ? `<p><small>Sources: ${sources.map(s => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join('; ')}</small></p>`
  : ''

const faqHtml = (items) => items.map(i => `<h3>${esc(i.q)}</h3>\n<p>${esc(i.a)}</p>`).join('\n')

// ─── live layout data from Supabase (falls back to content.js) ──────────────

async function fetchLayouts() {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const get = async (q) => {
    const res = await fetch(`${url}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`${q} → HTTP ${res.status}`)
    return res.json()
  }
  try {
    const [cities, layouts, plots] = await Promise.all([
      get('cities?select=id,name,state'),
      get('site_layouts?select=id,city_id,name,slug,description,address,card_image_url&is_published=eq.true&order=name'),
      get('plots?select=layout_id,status,price_per_sqft,dimension_sqft'),
    ])
    const cityById = Object.fromEntries(cities.map(c => [c.id, c.name.trim()]))
    return layouts.map((l) => {
      const own = plots.filter(p => p.layout_id === l.id)
      const prices = own.map(p => p.price_per_sqft).filter(n => n > 0)
      const sizes = own.map(p => p.dimension_sqft).filter(n => n > 0)
      return {
        slug: l.slug,
        name: l.name.trim(),
        city: cityById[l.city_id] || '',
        description: l.description?.trim() || '',
        address: l.address?.trim() || '',
        image: l.card_image_url || null,
        total: own.length,
        available: own.filter(p => p.status === 'available').length,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        minSize: sizes.length ? Math.min(...sizes) : 0,
        maxSize: sizes.length ? Math.max(...sizes) : 0,
      }
    })
  } catch (error) {
    console.warn(`[prerender] Supabase fetch failed (${error.message}); using static project list.`)
    return null
  }
}

const liveLayouts = await fetchLayouts()
const LAYOUTS = (liveLayouts || PROJECTS.filter(p => p.slug).map(p => ({
  slug: p.slug, name: p.name, city: p.location, description: p.summary, address: '', image: null,
  total: 0, available: 0, minPrice: 0, maxPrice: 0, minSize: 0, maxSize: 0,
}))).map((l) => {
  const project = PROJECTS.find(p => p.slug === l.slug)
  return { ...l, summary: project?.summary || l.description, location: project?.location || l.address || l.city, area: project?.area }
})

// ─── JSON-LD ────────────────────────────────────────────────────────────────

const organization = {
  '@type': ['RealEstateAgent', 'HomeAndConstructionBusiness'],
  '@id': ORG_ID,
  name: BUSINESS.name,
  alternateName: BUSINESS.alternateNames,
  description: BUSINESS.shortDescription,
  url: abs('/'),
  logo: DEFAULT_IMAGE,
  image: DEFAULT_IMAGE,
  telephone: BUSINESS.phoneE164,
  email: BUSINESS.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.address.locality,
    addressLocality: BUSINESS.address.city,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  },
  areaServed: BUSINESS.areaServed.map(name => ({ '@type': 'Place', name })),
  founder: {
    '@type': 'Person',
    name: BUSINESS.founder.name,
    jobTitle: BUSINESS.founder.jobTitle,
    memberOf: { '@type': 'Organization', name: 'NAREDCO Mysuru Chapter' },
  },
  knowsAbout: ['Residential plots in Mysuru', 'Gated community layouts', 'Managed farm land', 'Vastu-compliant plots', 'Independent house construction', 'Karnataka land approvals'],
  makesOffer: BUSINESS.services.map(name => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
  sameAs: BUSINESS.sameAs,
}

const website = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: abs('/'),
  name: BUSINESS.name,
  publisher: { '@id': ORG_ID },
  inLanguage: 'en-IN',
}

function breadcrumb(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })),
  }
}

const faqPage = (items, p) => ({
  '@type': 'FAQPage',
  '@id': `${abs(p)}#faq`,
  mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
})

function layoutListing(l) {
  const node = {
    '@type': 'RealEstateListing',
    '@id': `${abs(`/properties/${l.slug}`)}#listing`,
    name: `${l.name} — plots for sale, ${l.location}`,
    url: abs(`/properties/${l.slug}`),
    description: l.summary,
    provider: { '@id': ORG_ID },
    contentLocation: { '@type': 'Place', name: l.location, address: { '@type': 'PostalAddress', addressLocality: l.city, addressRegion: 'Karnataka', addressCountry: 'IN' } },
  }
  if (l.image) node.image = l.image
  if (l.minPrice) {
    node.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: l.minPrice,
      highPrice: l.maxPrice,
      offerCount: l.available,
      availability: l.available ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'INR', minPrice: l.minPrice, maxPrice: l.maxPrice, unitText: 'per sq ft' },
      seller: { '@id': ORG_ID },
    }
  }
  return node
}

const projectItemList = {
  '@type': 'ItemList',
  name: 'VCR Builders and Developers projects',
  itemListElement: PROJECTS.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: `${p.name} (${p.status}) — ${p.location}${p.acres ? `, ${p.acres} acres` : ''}`,
    ...(p.slug ? { url: abs(`/properties/${p.slug}`) } : {}),
  })),
}

// ─── shared static chrome ───────────────────────────────────────────────────

const NAV = [
  ['Home', '/'], ['Properties', '/properties'], ['Mysuru plot guide', GUIDE.path], ['FAQ', FAQ.path],
  ['Paperwork', '/paperwork'], ['About', '/about'], ['Contact', '/contact'],
]

const staticHeader = `<header><p><a href="/"><strong>${esc(BUSINESS.name)}</strong></a></p>
<nav>${NAV.map(([n, p]) => `<a href="${p}">${esc(n)}</a>`).join(' · ')}</nav></header>`

const staticFooter = `<footer>
<h2>Plots near Mysuru by area</h2>
<ul>${AREAS.map(a => `<li><a href="${a.path}">${esc(a.title)}</a></li>`).join('')}</ul>
<p><strong>${esc(BUSINESS.name)}</strong> — ${esc(BUSINESS.address.display)}. Phone <a href="tel:${BUSINESS.phoneE164}">${esc(BUSINESS.phone)}</a>. Email <a href="mailto:${BUSINESS.email}">${esc(BUSINESS.email)}</a>.</p>
</footer>`

function layoutFacts(l) {
  const facts = []
  if (l.total) facts.push(`${l.total} plots, ${l.available} available`)
  if (l.minSize) facts.push(l.minSize === l.maxSize ? `${inr(l.minSize)} sq ft plots` : `plot sizes ${inr(l.minSize)}–${inr(l.maxSize)} sq ft`)
  if (l.minPrice) facts.push(l.minPrice === l.maxPrice ? `₹${inr(l.minPrice)} per sq ft` : `₹${inr(l.minPrice)}–${inr(l.maxPrice)} per sq ft`)
  return facts.join(' · ')
}

// ─── pages ──────────────────────────────────────────────────────────────────

const pages = []

const projectsHtml = (list) => `<ul>${list.map(p => `<li><strong>${p.slug ? `<a href="/properties/${p.slug}">${esc(p.name)}</a>` : esc(p.name)}</strong> — ${esc(p.status)}, ${esc(p.location)}${p.acres ? `, ${p.acres} acres` : ''}. ${esc(p.summary)}</li>`).join('')}</ul>`

pages.push({
  path: '/',
  body: `<h1>${esc(BUSINESS.name)} — gated residential plots near Mysuru</h1>
<p><strong>Namma Nadu. Namma Property.</strong> ${esc(BUSINESS.shortDescription)}</p>
<p>Every VCR layout is a gated community with Vastu-compliant plots, clear titles and documentation, and partner bank financing. VCR also designs and builds independent homes for plot owners. Founder and Managing Director V. C. Ravikumar is President of the NAREDCO Mysuru Chapter.</p>
<h2>Projects</h2>
${projectsHtml(PROJECTS)}
<h2>Why buy with VCR</h2>
<ul>
<li>Gated community living — every project is a secure, gated layout.</li>
<li>100% Vastu-compliant plots.</li>
<li>Clear titles and complete paperwork: sale agreement, title deed, encumbrance certificate, layout approval, Khata assistance (<a href="/paperwork">details</a>).</li>
<li>Live plot maps online: see plot size, facing, availability and price before you visit (<a href="/properties">browse properties</a>).</li>
<li>Build your house, buy your land — VCR has built 25+ independent homes and can build yours.</li>
</ul>
<h2>Buying land near Mysuru?</h2>
<p>Read our <a href="${GUIDE.path}">2026 Mysuru plot buying guide</a> for prices by area, approval rules and a legal checklist, or see the <a href="${FAQ.path}">FAQ</a>.</p>`,
  jsonLd: [organization, website, projectItemList, { '@type': 'WebPage', '@id': `${abs('/')}#webpage`, url: abs('/'), name: ROUTES['/'].title, about: { '@id': ORG_ID }, isPartOf: { '@id': SITE_ID } }],
})

pages.push({
  path: '/properties',
  body: `<h1>Plots for sale near Mysuru — VCR properties</h1>
<p>Premium plots across the Mysuru region — Vastu-compliant, gated communities. Each layout has a live plot map showing plot size, facing, availability and price per sq ft.</p>
<h2>Selling now</h2>
<ul>${LAYOUTS.map(l => `<li><a href="/properties/${l.slug}"><strong>${esc(l.name)}</strong></a> — ${esc(l.location)}. ${esc(l.summary)} ${esc(layoutFacts(l))}</li>`).join('')}</ul>
<h2>Upcoming and ongoing</h2>
${projectsHtml(PROJECTS.filter(p => !p.slug))}`,
  jsonLd: [organization, website, projectItemList, breadcrumb([['Home', '/'], ['Properties', '/properties']])],
})

for (const l of LAYOUTS) {
  const p = `/properties/${l.slug}`
  const area = AREAS.find(a => a.key === l.area)
  pages.push({
    path: p,
    title: `${l.name}, ${l.city} — Plots for Sale | ${BUSINESS.name}`,
    description: `${l.summary} ${layoutFacts(l)}. Live plot map and site visits by ${BUSINESS.name}.`.replace(/\s+/g, ' ').trim(),
    image: l.image,
    body: `<h1>${esc(l.name)} — plots for sale, ${esc(l.location)}</h1>
<p>${esc(l.summary)}</p>
${layoutFacts(l) ? `<p><strong>${esc(layoutFacts(l))}</strong> (as of ${esc(CONTENT_UPDATED_LABEL)}; the live plot map has current availability).</p>` : ''}
<p>Developer: <a href="/">${esc(BUSINESS.name)}</a>. Gated, Vastu-compliant layout. Book a site visit on this page or call <a href="tel:${BUSINESS.phoneE164}">${esc(BUSINESS.phone)}</a>.</p>
${area ? `<p>More about buying land here: <a href="${area.path}">${esc(area.title)}</a>.</p>` : ''}`,
    jsonLd: [organization, website, layoutListing(l), breadcrumb([['Home', '/'], ['Properties', '/properties'], [l.name, p]])],
  })
}

pages.push({
  path: '/about',
  body: `<h1>About ${esc(BUSINESS.name)} — from farmer's son to real estate developer</h1>
<p>${esc(BUSINESS.founder.name)}, Managing Director of ${esc(BUSINESS.name)}, comes from a farming family in Vadiandahalli, Srirangapatna Taluk. He completed his ITI in Melukote and a diploma from BTL Polytechnic, Bengaluru, started work on a monthly wage of ₹500, and later began as a civil contractor handling road and government works for ZP, PWD and Nirmithi Kendra.</p>
<p>He founded VCR Builders and Developers in Srirangapatna. Its breakthrough was a landmark 12-acre island villa project (2010–2014). VCR has since delivered 25+ independent homes and multiple residential layouts, with flagship work including VCR River View Gardenia in Srirangapatna and homes across Srirangapatna, Mysuru and Bengaluru.</p>
<p>Expertise: land development, layout civil works, DC conversion and layout elevation advice, 3D modelling and rendering, and end-to-end project management.</p>
<h2>Community</h2>
<p>Ravikumar is President of the NAREDCO Mysuru Chapter and Regional Head of Lions Club Mysore, a participant in the BAI Mysore Centre's MYBUILD exhibitions, and supports education for underprivileged students and competitive-exam coaching. During COVID-19 VCR distributed over 500 food kits across Mysuru, Mandya and Bengaluru.</p>`,
  jsonLd: [organization, website, { '@type': 'AboutPage', url: abs('/about'), about: { '@id': ORG_ID } }, breadcrumb([['Home', '/'], ['About', '/about']])],
})

pages.push({
  path: '/paperwork',
  body: `<h1>Plot documents and paperwork</h1>
<p>Every VCR property comes with complete, transparent documentation. Here's what to expect.</p>
${PAPERWORK.map(d => `<h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p>`).join('\n')}
<p>See also the <a href="${GUIDE.path}#checklist">legal checklist for buying a plot in Mysuru</a>.</p>`,
  jsonLd: [organization, website, breadcrumb([['Home', '/'], ['Paperwork', '/paperwork']])],
})

pages.push({
  path: '/contact',
  body: `<h1>Contact ${esc(BUSINESS.name)}</h1>
<p>Interested in a plot or have a question? Call <a href="tel:${BUSINESS.phoneE164}">${esc(BUSINESS.phone)}</a>, email <a href="mailto:${BUSINESS.email}">${esc(BUSINESS.email)}</a>, or leave your details on this page and the team will usually respond within one business day.</p>
<p>Head office: ${esc(BUSINESS.address.display)}.</p>`,
  jsonLd: [organization, website, { '@type': 'ContactPage', url: abs('/contact'), about: { '@id': ORG_ID } }, breadcrumb([['Home', '/'], ['Contact', '/contact']])],
})

pages.push({
  path: GUIDE.path,
  ogType: 'article',
  body: `<article><h1>${esc(GUIDE.title)}</h1>
<p><small>Updated ${esc(CONTENT_UPDATED_LABEL)} · ${esc(BUSINESS.name)}, Mysuru</small></p>
${GUIDE.intro.map(p => `<p>${esc(p)}</p>`).join('\n')}
${GUIDE.sections.map(s => `<section id="${s.id}"><h2>${esc(s.heading)}</h2>\n${blocksToHtml(s.body)}\n${sourcesHtml(s.sources)}</section>`).join('\n')}
</article>`,
  jsonLd: [organization, website, {
    '@type': 'Article',
    '@id': `${abs(GUIDE.path)}#article`,
    headline: GUIDE.title,
    description: GUIDE.description,
    url: abs(GUIDE.path),
    datePublished: CONTENT_UPDATED,
    dateModified: CONTENT_UPDATED,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    about: [{ '@type': 'Place', name: 'Mysuru, Karnataka' }],
    inLanguage: 'en-IN',
  }, breadcrumb([['Home', '/'], ['Mysuru plot buying guide', GUIDE.path]])],
})

pages.push({
  path: FAQ.path,
  body: `<h1>${esc(FAQ.title)} — buying plots near Mysuru with VCR</h1>\n${faqHtml(FAQ.items)}`,
  jsonLd: [organization, website, faqPage(FAQ.items, FAQ.path), breadcrumb([['Home', '/'], ['FAQ', FAQ.path]])],
})

for (const a of AREAS) {
  const projects = projectsForArea(a.key).map(p => ({ ...p, ...(LAYOUTS.find(l => l.slug === p.slug) || {}), name: p.name, location: p.location, summary: p.summary }))
  pages.push({
    path: a.path,
    body: `<h1>${esc(a.title)}</h1>
<p><small>Updated ${esc(CONTENT_UPDATED_LABEL)} · ${esc(BUSINESS.name)}, Mysuru</small></p>
${a.intro.map(p => `<p>${esc(p)}</p>`).join('\n')}
<h2>VCR projects in ${esc(a.place)}</h2>
<ul>${projects.map(p => `<li><strong>${p.slug ? `<a href="/properties/${p.slug}">${esc(p.name)}</a>` : esc(p.name)}</strong> — ${esc(p.status)}, ${esc(p.location)}${p.acres ? `, ${p.acres} acres` : ''}. ${esc(p.summary)}${p.total ? ` ${esc(layoutFacts(p))}.` : ''}</li>`).join('')}</ul>
<h2>${esc(a.place)} land prices and approvals</h2>
${a.market.map(p => `<p>${esc(p)}</p>`).join('\n')}
<p>Compare areas and run the full legal checklist in the <a href="${GUIDE.path}">Mysuru plot buying guide</a>.</p>
<h2>Questions about ${esc(a.place)}</h2>
${faqHtml(a.faq)}`,
    jsonLd: [organization, website, faqPage(a.faq, a.path), ...projects.filter(p => p.total).map(layoutListing), breadcrumb([['Home', '/'], [a.title, a.path]])],
  })
}

// ─── HTML output ────────────────────────────────────────────────────────────

const template = await readFile(path.join(DIST, 'index.html'), 'utf8')
const HEAD_RE = /<!--seo:head:start-->[\s\S]*?<!--seo:head:end-->/
if (!HEAD_RE.test(template) || !template.includes('<!--seo:body-->')) {
  throw new Error('[prerender] dist/index.html is missing the seo markers — was index.html changed?')
}

function headTags({ title, description, path: p, image, ogType = 'website', noindex = false }) {
  const url = abs(p)
  const img = image || DEFAULT_IMAGE
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="${esc(BUSINESS.name)}" />`,
    '<meta property="og:locale" content="en_IN" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
  ].join('\n    ')
}

const jsonLdTag = (nodes) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')}</script>`

function render(page) {
  const meta = ROUTES[page.path] || {}
  const head = headTags({
    title: page.title || meta.title,
    description: page.description || meta.description,
    path: page.path,
    image: page.image,
    ogType: page.ogType,
  })
  return template
    .replace(HEAD_RE, `<!--seo:head:start-->\n    ${head}\n    ${jsonLdTag(page.jsonLd)}\n    <!--seo:head:end-->`)
    .replace('<!--seo:body-->', `<div class="seo-static">\n${staticHeader}\n<main>\n${page.body}\n</main>\n${staticFooter}\n</div>`)
}

async function write(rel, contents) {
  const file = path.join(DIST, rel)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, contents)
}

for (const page of pages) {
  const missing = !(page.title || ROUTES[page.path]?.title)
  if (missing) throw new Error(`[prerender] no title for ${page.path}`)
  await write(page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`, render(page))
}

// SPA shell for everything else (admin, buyer portal, login, unknown slugs).
await write('app.html', template.replace(HEAD_RE, `<!--seo:head:start-->\n    ${headTags({ title: BUSINESS.name, description: BUSINESS.shortDescription, path: '/', noindex: true })}\n    <!--seo:head:end-->`).replace('<!--seo:body-->', ''))

// ─── sitemap.xml, robots.txt, llms.txt ──────────────────────────────────────

// Same shape as pd-tool's @astrojs/sitemap output: /sitemap-index.xml points
// at /sitemap-0.xml, which lists the pages. /sitemap.xml stays as a copy of the
// URL list so anything already submitted to Search Console keeps working.
//
// lastmod comes from git — the last commit that touched the files a page is
// built from — not from the build clock. Stamping every URL "today" on every
// deploy is the kind of lastmod Google learns to distrust and then ignores.
// No git (tarball build, shallow clone without history) → lastmod is omitted,
// which is better than asserting a date we can't back up.

const SHARED_SOURCES = ['src/seo/content.js']
const PAGE_SOURCES = {
  '/': ['src/pages/HomePage.jsx', 'src/components/home'],
  '/properties': ['src/pages/PropertiesPage.jsx', 'src/components/properties'],
  '/about': ['src/pages/AboutPage.jsx'],
  '/paperwork': ['src/pages/PaperworkPage.jsx'],
  '/contact': ['src/pages/ContactPage.jsx', 'src/components/properties/EnquiryForm.jsx'],
  [GUIDE.path]: ['src/pages/GuidePage.jsx', 'src/components/seo'],
  [FAQ.path]: ['src/pages/FaqPage.jsx', 'src/components/seo'],
}
const sourcesFor = (p) => PAGE_SOURCES[p]
  || (p.startsWith('/properties/') ? ['src/pages/LayoutViewPage.jsx', 'src/components/properties'] : null)
  || (AREAS.some(a => a.path === p) ? ['src/pages/AreaPage.jsx', 'src/components/seo'] : [])

// Vercel clones with limited history. In a shallow clone `git log -1 -- path`
// returns the oldest commit in the clone for any file not changed recently —
// a wrong date, not a missing one — so lastmod is left out instead. Set
// VERCEL_DEEP_CLONE=true in the Vercel project to get real dates there.
const SHALLOW_CLONE = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'true'
  } catch {
    return true
  }
})()

function gitLastmod(files) {
  if (SHALLOW_CLONE) return null
  try {
    // One call: git returns the newest commit touching any of the paths.
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return iso ? new Date(iso).toISOString() : null
  } catch {
    return null
  }
}

// Priority is relative within this site only: the home page and the live plot
// maps are what buyers act on; the guide and area pages support them.
function sitemapMeta(p) {
  if (p === '/') return { priority: '1.0', changefreq: 'weekly' }
  if (p === '/properties' || p.startsWith('/properties/')) return { priority: '0.9', changefreq: 'weekly' }
  if (p === GUIDE.path || AREAS.some(a => a.path === p)) return { priority: '0.8', changefreq: 'monthly' }
  if (p === '/contact') return { priority: '0.5', changefreq: 'yearly' }
  return { priority: '0.6', changefreq: 'monthly' }
}

const sitemapEntries = pages.map((page) => ({
  loc: abs(page.path),
  lastmod: gitLastmod([...sourcesFor(page.path), ...SHARED_SOURCES]),
  ...sitemapMeta(page.path),
}))

const urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(e => [
    '  <url>',
    `    <loc>${esc(e.loc)}</loc>`,
    e.lastmod && `    <lastmod>${e.lastmod}</lastmod>`,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')}
</urlset>
`
const newestLastmod = sitemapEntries.map(e => e.lastmod).filter(Boolean).sort().at(-1)

await write('sitemap-0.xml', urlset)
await write('sitemap.xml', urlset)
await write('sitemap-index.xml', `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-0.xml</loc>${newestLastmod ? `\n    <lastmod>${newestLastmod}</lastmod>` : ''}
  </sitemap>
</sitemapindex>
`)

// '/my/' not '/my': robots rules are prefix matches and '/my' would block /mysore-plots-guide.
// The bare /my route is covered by the X-Robots-Tag header in vercel.json.
// '/app$' and '/app/' rather than '/app': a bare prefix would also block
// /apple-touch-icon.png. ($ is supported by Google and Bing.)
const PRIVATE_PATHS = ['/admin', '/my/', '/login', '/agent', '/app$', '/app/', '/app.html']
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'Googlebot',
]
const group = (agent) => [`User-agent: ${agent}`, 'Allow: /', ...PRIVATE_PATHS.map(p => `Disallow: ${p}`)].join('\n')
await write('robots.txt', `# Search engines and AI assistants are welcome to read and cite this site.
${[...AI_AGENTS, '*'].map(group).join('\n\n')}

Sitemap: ${SITE_URL}/sitemap-index.xml
`)

const projectLines = PROJECTS.map((p) => {
  const live = LAYOUTS.find(l => l.slug === p.slug)
  const facts = live ? layoutFacts(live) : ''
  const name = p.slug ? `[${p.name}](${abs(`/properties/${p.slug}`)})` : p.name
  return `- ${name} — ${p.status}, ${p.location}${p.acres ? `, ${p.acres} acres` : ''}. ${p.summary}${facts ? ` ${facts}.` : ''}`
}).join('\n')

await write('llms.txt', `# ${BUSINESS.name}

> ${BUSINESS.shortDescription}

- Also known as: ${BUSINESS.alternateNames.join(', ')}
- Head office: ${BUSINESS.address.display}
- Phone: ${BUSINESS.phone} · Email: ${BUSINESS.email}
- Founder & Managing Director: ${BUSINESS.founder.name} (${BUSINESS.founder.affiliations.join('; ')})
- Areas served: ${BUSINESS.areaServed.join(', ')}
- What VCR offers: ${BUSINESS.services.join(', ')}
- Every layout is gated and Vastu-compliant; live plot maps with size, facing, availability and price are on the website.

## Projects

${projectLines}

## Guides

- [${GUIDE.title}](${abs(GUIDE.path)}): ${GUIDE.description}
- [FAQ](${abs(FAQ.path)}): ${FAQ.description}
${AREAS.map(a => `- [${a.title}](${abs(a.path)}): ${a.description}`).join('\n')}

## Company

- [About VCR and V. C. Ravikumar](${abs('/about')})
- [Plot documents and paperwork](${abs('/paperwork')})
- [Contact](${abs('/contact')})
- [Full text for LLMs](${abs('/llms-full.txt')})
`)

await write('llms-full.txt', `# ${BUSINESS.name} — full reference

${BUSINESS.shortDescription}

Head office: ${BUSINESS.address.display}. Phone ${BUSINESS.phone}. Email ${BUSINESS.email}. Website ${abs('/')}.
Content updated: ${CONTENT_UPDATED_LABEL}.

## Projects

${projectLines}

## ${GUIDE.title}

${GUIDE.intro.join('\n\n')}

${GUIDE.sections.map(s => `### ${s.heading}\n\n${blocksToText(s.body)}${s.sources?.length ? `\n\nSources: ${s.sources.map(x => `${x.label} (${x.url})`).join('; ')}` : ''}`).join('\n\n')}

${AREAS.map(a => `## ${a.title}\n\n${a.intro.join('\n\n')}\n\n${a.market.join('\n\n')}\n\n${a.faq.map(f => `**${f.q}**\n${f.a}`).join('\n\n')}`).join('\n\n')}

## Frequently asked questions

${FAQ.items.map(f => `**${f.q}**\n${f.a}`).join('\n\n')}

## Documents every VCR buyer receives

${PAPERWORK.map(d => `- ${d.title}: ${d.desc}`).join('\n')}
`)

console.log(`[prerender] ${pages.length} pages + app.html, sitemap-index.xml (+ sitemap-0.xml), robots.txt, llms.txt, llms-full.txt → ${SITE_URL}${liveLayouts ? ' (live layout data)' : ''}`)
