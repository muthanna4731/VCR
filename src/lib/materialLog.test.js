import { describe, it, expect } from 'vitest'
import {
  MATERIALS,
  UNITS,
  parseNumber,
  computeAmount,
  validateEntry,
  istDate,
  materialKey,
  summarize,
  materialOptions,
  buildSiteOptions,
  formatINR,
  formatINRCompact,
  isMissingTableError,
} from './materialLog'

describe('constants', () => {
  it('MATERIALS ends with Miscellaneous and has no Other', () => {
    expect(MATERIALS[0]).toBe('Cement')
    expect(MATERIALS.at(-1)).toBe('Miscellaneous')
    expect(MATERIALS.some(m => m.startsWith('Other'))).toBe(false)
    expect(MATERIALS).toHaveLength(23)
  })
  it('UNITS matches spec', () => {
    expect(UNITS).toEqual(['bags', 'tonnes', 'cft', 'brass', 'loads', 'trips', 'kg', 'nos', 'litres', 'sq ft', 'rft'])
  })
})

describe('parseNumber', () => {
  it('strips commas and spaces', () => {
    expect(parseNumber('20,000')).toBe(20000)
    expect(parseNumber(' 400 ')).toBe(400)
    expect(parseNumber(12.5)).toBe(12.5)
  })
  it('empty/null give null', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('  ')).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber(undefined)).toBeNull()
  })
  it('non-numeric gives NaN', () => {
    expect(Number.isNaN(parseNumber('abc'))).toBe(true)
  })
})

describe('computeAmount', () => {
  it('multiplies quantity by rate', () => {
    expect(computeAmount({ quantity: '50', rate: '400', amount: '' })).toBe(20000)
  })
  it('typed amount wins', () => {
    expect(computeAmount({ quantity: '50', rate: '400', amount: '19,500' })).toBe(19500)
  })
  it('null when nothing usable', () => {
    expect(computeAmount({ quantity: '', rate: '', amount: '' })).toBeNull()
    expect(computeAmount({ quantity: '5', rate: '', amount: '' })).toBeNull()
    expect(computeAmount({ quantity: '0', rate: '10', amount: '0' })).toBeNull()
  })
  it('rounds to 2 dp', () => {
    expect(computeAmount({ quantity: '3', rate: '0.335', amount: '' })).toBe(1.01)
  })
})

describe('istDate', () => {
  it('uses Asia/Kolkata', () => {
    expect(istDate(new Date('2026-11-13T18:45:00Z'))).toBe('2026-11-14')
    expect(istDate(new Date('2026-11-13T18:00:00Z'))).toBe('2026-11-13')
  })
  it('defaults to now in YYYY-MM-DD', () => {
    expect(istDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('materialKey', () => {
  it('trims and lowercases', () => {
    expect(materialKey('  Cement ')).toBe('cement')
  })
})

describe('validateEntry', () => {
  it('accepts a valid in entry', () => {
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', quantity: '50', unit: 'bags', rate: '400' }).ok).toBe(true)
  })
  it('in needs an amount', () => {
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1' }).errors.amount).toBeTruthy()
  })
  it('in with NaN amount errors on amount', () => {
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', amount: 'abc' }).errors.amount).toBeTruthy()
  })
  it('in needs material and site', () => {
    const { ok, errors } = validateEntry({ kind: 'in', amount: '10' })
    expect(ok).toBe(false)
    expect(errors.material).toBeTruthy()
    expect(errors.siteId).toBeTruthy()
  })
  it('NaN quantity or rate errors on that field', () => {
    const { errors } = validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', amount: '10', quantity: 'x', rate: 'y' })
    expect(errors.quantity).toBeTruthy()
    expect(errors.rate).toBeTruthy()
  })
  it('out rejects same from/to site', () => {
    expect(validateEntry({ kind: 'out', material: 'M-sand', siteId: 'w', fromSiteId: 'w', quantity: '2' }).errors.siteId).toBeTruthy()
  })
  it('out needs from site and positive quantity', () => {
    const { ok, errors } = validateEntry({ kind: 'out', material: 'M-sand', siteId: 'a' })
    expect(ok).toBe(false)
    expect(errors.fromSiteId).toBeTruthy()
    expect(errors.quantity).toBeTruthy()
  })
  it('accepts a valid out entry', () => {
    expect(validateEntry({ kind: 'out', material: 'M-sand', siteId: 'a', fromSiteId: 'w', quantity: '2', unit: 'loads' }).ok).toBe(true)
  })
  it('requires a unit whenever a quantity is given', () => {
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', quantity: '50', amount: '100' }).errors.unit).toBeTruthy()
    expect(validateEntry({ kind: 'out', material: 'M-sand', siteId: 'a', fromSiteId: 'w', quantity: '2' }).errors.unit).toBeTruthy()
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', amount: '100' }).errors.unit).toBeUndefined()
    expect(validateEntry({ kind: 'in', material: 'Cement', siteId: 's1', quantity: '50', unit: 'bags', amount: '100' }).ok).toBe(true)
  })
  it('Miscellaneous check ignores case and spacing', () => {
    expect(validateEntry({ kind: 'in', material: 'miscellaneous ', siteId: 's1', amount: '5' }).errors.note).toBeTruthy()
  })
  it('note needs text', () => {
    expect(validateEntry({ kind: 'note', note: '  ' }).ok).toBe(false)
    expect(validateEntry({ kind: 'note', note: 'Slab poured' }).ok).toBe(true)
  })
  it('Miscellaneous requires a note', () => {
    expect(validateEntry({ kind: 'in', material: 'Miscellaneous', siteId: 's1', amount: '500' }).errors.note).toBeTruthy()
    expect(validateEntry({ kind: 'in', material: 'Miscellaneous', siteId: 's1', amount: '500', note: 'nails' }).ok).toBe(true)
  })
})

const sites = [
  { id: 'W', name: 'Warehouse', kind: 'warehouse' },
  { id: 'A', name: 'Green Acres', kind: 'site' },
  { id: 'B', name: 'Hill View', kind: 'site' },
]
const TODAY = '2026-11-13'
const base = { deleted_at: null, from_site_id: null, quantity: null, unit: null, amount: null }
const entries = [
  { ...base, kind: 'in', entry_date: TODAY, site_id: 'A', material: 'Cement', quantity: 50, unit: 'bags', amount: 20000 },
  { ...base, kind: 'in', entry_date: '2026-11-02', site_id: 'W', material: 'cement ', quantity: 100, unit: 'bags', amount: 40000 },
  { ...base, kind: 'out', entry_date: TODAY, site_id: 'A', from_site_id: 'W', material: 'Cement', quantity: 30, unit: 'bags' },
  { ...base, kind: 'in', entry_date: '2026-10-30', site_id: 'B', material: 'Steel / TMT bars', amount: 90000 },
  { ...base, kind: 'in', entry_date: TODAY, site_id: 'A', material: 'Cement', amount: 99999, deleted_at: '2026-11-13T05:00:00Z' },
  { ...base, kind: 'note', entry_date: TODAY, site_id: 'A', material: null },
]

describe('summarize', () => {
  const s = summarize(entries, sites, TODAY)
  it('computes today and month spend', () => {
    expect(s.todaySpend).toBe(20000)
    expect(s.monthSpend).toBe(60000)
  })
  it('groups by site, this month, desc', () => {
    expect(s.bySite).toEqual([
      { siteId: 'W', name: 'Warehouse', amount: 40000 },
      { siteId: 'A', name: 'Green Acres', amount: 20000 },
    ])
  })
  it('top materials use canonical spelling and merge variants', () => {
    expect(s.topMaterials[0]).toEqual({ material: 'Cement', amount: 60000 })
    expect(s.topMaterials).toHaveLength(1)
  })
  it('warehouse stock nets in minus out', () => {
    expect(s.warehouseStock).toEqual([{ material: 'Cement', unit: 'bags', quantity: 70 }])
  })
  it('has no NaN', () => {
    expect(JSON.stringify(s)).not.toMatch(/NaN|null/)
    expect(Number.isNaN(s.todaySpend)).toBe(false)
  })
  it('names custom materials by first-seen trimmed spelling', () => {
    const custom = [
      { ...base, kind: 'in', entry_date: '2026-11-01', site_id: 'W', material: 'kerb stones ', quantity: 10, unit: 'nos', amount: 100 },
      { ...base, kind: 'in', entry_date: '2026-11-02', site_id: 'W', material: 'Kerb Stones', quantity: 5, unit: 'nos', amount: 50 },
    ]
    const r = summarize(custom, sites, TODAY)
    expect(r.warehouseStock).toEqual([{ material: 'kerb stones', unit: 'nos', quantity: 15 }])
    expect(r.topMaterials).toEqual([{ material: 'kerb stones', amount: 150 }])
  })
  it('keeps different units as separate stock lines and shows negatives', () => {
    const r = summarize([
      { ...base, kind: 'in', entry_date: TODAY, site_id: 'W', material: 'M-sand', quantity: 2, unit: 'loads', amount: 1 },
      { ...base, kind: 'in', entry_date: TODAY, site_id: 'W', material: 'M-sand', quantity: 3, unit: 'tonnes', amount: 1 },
      { ...base, kind: 'out', entry_date: TODAY, site_id: 'A', from_site_id: 'W', material: 'M-sand', quantity: 5, unit: 'loads' },
    ], sites, TODAY)
    expect(r.warehouseStock).toContainEqual({ material: 'M-sand', unit: 'loads', quantity: -3 })
    expect(r.warehouseStock).toContainEqual({ material: 'M-sand', unit: 'tonnes', quantity: 3 })
  })
  it('limits top materials to 5', () => {
    const many = MATERIALS.slice(0, 7).map((m, i) => ({ ...base, kind: 'in', entry_date: TODAY, site_id: 'A', material: m, amount: (i + 1) * 10 }))
    expect(summarize(many, sites, TODAY).topMaterials).toHaveLength(5)
  })
  it('ignores deleted entries in warehouse stock', () => {
    const r = summarize([
      { ...base, kind: 'in', entry_date: TODAY, site_id: 'W', material: 'Cement', quantity: 10, unit: 'bags', amount: 1 },
      { ...base, kind: 'in', entry_date: TODAY, site_id: 'W', material: 'Cement', quantity: 99, unit: 'bags', amount: 1, deleted_at: '2026-11-13T05:00:00Z' },
      { ...base, kind: 'out', entry_date: TODAY, site_id: 'A', from_site_id: 'W', material: 'Cement', quantity: 7, unit: 'bags', deleted_at: '2026-11-13T05:00:00Z' },
    ], sites, TODAY)
    expect(r.warehouseStock).toEqual([{ material: 'Cement', unit: 'bags', quantity: 10 }])
  })
  it('handles empty input', () => {
    expect(summarize([], sites, TODAY)).toEqual({ todaySpend: 0, monthSpend: 0, bySite: [], topMaterials: [], warehouseStock: [] })
  })
})

describe('materialOptions', () => {
  it('appends custom names once, before Miscellaneous, without duplicating canonical', () => {
    const opts = materialOptions([{ material: 'Kerb stones' }, { material: 'kerb stones' }, { material: 'cement' }])
    expect(opts.filter(o => o === 'Kerb stones')).toHaveLength(1)
    expect(opts.filter(o => o.toLowerCase() === 'cement')).toHaveLength(1)
    expect(opts.indexOf('Kerb stones')).toBeLessThan(opts.indexOf('Miscellaneous'))
    expect(opts.at(-1)).toBe('Miscellaneous')
  })
  it('sorts custom names alphabetically', () => {
    const opts = materialOptions([{ material: 'Zinc sheet' }, { material: 'Aluminium' }])
    expect(opts.indexOf('Aluminium')).toBeLessThan(opts.indexOf('Zinc sheet'))
  })
})

describe('buildSiteOptions', () => {
  const layouts = [{ id: 'L1', name: 'Green Acres' }, { id: 'L2', name: 'Palm Grove' }]
  const msites = [
    { id: 'W', name: 'Warehouse', kind: 'warehouse', layout_id: null, archived: false },
    { id: 'S1', name: 'Green Acres', kind: 'site', layout_id: 'L1', archived: false },
    { id: 'S2', name: 'Private yard', kind: 'site', layout_id: null, archived: false },
    { id: 'S3', name: 'Old yard', kind: 'site', layout_id: null, archived: true },
  ]
  const opts = buildSiteOptions(layouts, msites)
  it('puts warehouse first', () => {
    expect(opts[0]).toMatchObject({ value: 'site:W', siteId: 'W', kind: 'warehouse', label: 'Warehouse' })
  })
  it('uses linked site id for a layout', () => {
    expect(opts.find(o => o.value === 'layout:L1')).toMatchObject({ siteId: 'S1', layoutId: 'L1', label: 'Green Acres' })
  })
  it('unlinked layout has null siteId', () => {
    expect(opts.find(o => o.value === 'layout:L2')).toMatchObject({ siteId: null, layoutId: 'L2' })
  })
  it('includes private sites, drops archived, no duplicate for linked site', () => {
    expect(opts.find(o => o.value === 'site:S2')).toMatchObject({ siteId: 'S2', layoutId: null })
    expect(opts.find(o => o.value === 'site:S3')).toBeUndefined()
    expect(opts.find(o => o.value === 'site:S1')).toBeUndefined()
    expect(opts.map(o => o.value)).toEqual(['site:W', 'layout:L1', 'layout:L2', 'site:S2'])
  })
  it('ignores an archived site linked to a layout', () => {
    const o = buildSiteOptions(layouts, [{ id: 'S1', name: 'x', kind: 'site', layout_id: 'L1', archived: true }])
    expect(o.find(x => x.value === 'layout:L1').siteId).toBeNull()
  })
})

describe('formatters', () => {
  it('formatINR', () => {
    expect(formatINR(20000)).toBe('₹20,000')
    expect(formatINR(1234567)).toBe('₹12,34,567')
    expect(formatINR(1234.5)).toBe('₹1,234.50')
    expect(formatINR(0)).toBe('₹0')
    expect(formatINR(1234.001)).toBe('₹1,234')
    expect(formatINR(-0.001)).toBe('₹0')
    expect(formatINRCompact(-0.001)).toBe('₹0')
    expect(formatINR(NaN)).toBe('₹0')
    expect(formatINR(undefined)).toBe('₹0')
  })
  it('formatINRCompact', () => {
    expect(formatINRCompact(610000)).toBe('₹6.1 L')
    expect(formatINRCompact(12000000)).toBe('₹1.2 Cr')
    expect(formatINRCompact(48200)).toBe('₹48,200')
    expect(formatINRCompact(100000)).toBe('₹1 L')
    expect(formatINRCompact(9_999_999)).not.toBe('₹100 L')
    expect(formatINRCompact(9_999_999)).toBe('₹1 Cr')
    expect(formatINRCompact(Infinity)).toBe('₹0')
    expect(formatINRCompact(NaN)).toBe('₹0')
  })
})

describe('isMissingTableError', () => {
  it('detects missing table codes and messages', () => {
    expect(isMissingTableError({ code: '42P01' })).toBe(true)
    expect(isMissingTableError({ code: 'PGRST205' })).toBe(true)
    expect(isMissingTableError({ code: 'PGRST202' })).toBe(true)
    expect(isMissingTableError({ message: 'relation "x" does not exist' })).toBe(true)
    expect(isMissingTableError({ message: 'Could not find in the schema cache' })).toBe(true)
  })
  it('ignores other errors', () => {
    expect(isMissingTableError({ code: '23505' })).toBe(false)
    expect(isMissingTableError({ code: '42703', message: 'column "foo" does not exist' })).toBe(false)
    expect(isMissingTableError({ code: '42703', message: 'column "x" of relation "y" does not exist' })).toBe(false)
    expect(isMissingTableError({ code: 'PGRST204', message: "Could not find the 'x' column of 'y' in the schema cache" })).toBe(false)
    expect(isMissingTableError(null)).toBe(false)
  })
})
