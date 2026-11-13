import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { runSupabaseMutation, runSupabaseRequest } from '../lib/supabaseRequest'
import { computeAmount, isMissingTableError, istDate, parseNumber } from '../lib/materialLog'

const PAGE_SIZE = 1000
const UNIQUE_VIOLATION = '23505'

const text = v => {
  if (v === null || v === undefined) return null
  const trimmed = String(v).trim()
  return trimmed === '' ? null : trimmed
}

const num = v => {
  const n = parseNumber(v)
  return Number.isFinite(n) ? n : null
}

// entry_date desc, then created_at desc (same order the load query uses).
function byNewest(a, b) {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1
  if (a.id !== b.id) return a.id < b.id ? 1 : -1
  return 0
}

// Form -> material_entries row. created_by / created_by_name are never sent (the DB stamps them).
// siteId / fromSiteId are already-resolved material_sites ids (or null).
function toRow(form, siteId, fromSiteId) {
  const kind = form.kind
  const base = {
    kind,
    entry_date: text(form.entryDate) ?? istDate(),
    note: text(form.note),
  }

  if (kind === 'note') {
    return {
      ...base,
      site_id: siteId,
      from_site_id: null,
      material: null,
      quantity: null,
      unit: null,
      rate: null,
      amount: null,
      vendor: text(form.vendor),
    }
  }

  return {
    ...base,
    site_id: siteId,
    // For 'out', a null source is filled with the Warehouse by the DB on insert.
    from_site_id: kind === 'out' ? fromSiteId : null,
    material: text(form.material),
    quantity: num(form.quantity),
    unit: text(form.unit),
    rate: num(form.rate),
    amount: kind === 'in' ? computeAmount(form) : null,
    vendor: text(form.vendor),
  }
}

export function useMaterialLog() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])
  const [sites, setSites] = useState([])
  const [layouts, setLayouts] = useState([])

  // Mutations read the latest lists through refs so the callbacks stay stable.
  const layoutsRef = useRef(layouts)
  const sitesRef = useRef(sites)
  layoutsRef.current = layouts
  sitesRef.current = sites

  const aliveRef = useRef(true)
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    const stale = () => !aliveRef.current || seq !== loadSeq.current
    setStatus('loading')
    setError(null)

    try {
      const [layoutsRes, sitesRes] = await Promise.all([
        runSupabaseRequest(
          () => supabase.from('site_layouts').select('id, name').order('name'),
          { label: 'Load layouts for material log' }
        ),
        runSupabaseRequest(
          () => supabase.from('material_sites').select('*').order('created_at'),
          { label: 'Load material sites' }
        ),
      ])

      const all = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const page = await runSupabaseRequest(
          () => supabase
            .from('material_entries')
            .select('*')
            .is('deleted_at', null)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false }) // stable paging when rows tie
            .range(from, from + PAGE_SIZE - 1),
          { label: 'Load material entries' }
        )
        const rows = page.data ?? []
        all.push(...rows)
        if (rows.length < PAGE_SIZE) break
        if (stale()) return
      }

      if (stale()) return
      setLayouts(layoutsRes.data ?? [])
      setSites(sitesRes.data ?? [])
      setEntries(all)
      setStatus('ready')
    } catch (err) {
      if (stale()) return
      setError(err)
      setStatus(isMissingTableError(err) ? 'missing' : 'error')
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => { aliveRef.current = false }
  }, [load])

  const upsertLocalSite = useCallback(site => {
    if (!aliveRef.current) return
    setSites(prev => (prev.some(s => s.id === site.id)
      ? prev.map(s => (s.id === site.id ? site : s))
      : [...prev, site]))
  }, [])

  const addSite = useCallback(async name => {
    const clean = text(name)
    if (!clean) throw new Error('Enter a site name')

    try {
      const { data } = await runSupabaseMutation(
        () => supabase.from('material_sites').insert({ name: clean, kind: 'site' }).select().single(),
        { label: 'Add material site' }
      )
      upsertLocalSite(data)
      return data
    } catch (err) {
      if (err?.code !== UNIQUE_VIOLATION) throw err
      // Same name (case-insensitive) already live: hand back that site.
      const key = clean.toLowerCase()
      const local = sitesRef.current.find(s => !s.archived && s.name.trim().toLowerCase() === key)
      if (local) return local
      const { data } = await runSupabaseRequest(
        () => supabase.from('material_sites').select('*').eq('archived', false).ilike('name', clean.replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle(),
        { label: 'Find existing material site' }
      )
      if (!data) throw err
      upsertLocalSite(data)
      return data
    }
  }, [upsertLocalSite])

  const resolveSiteId = useCallback(async optionValue => {
    const value = text(optionValue)
    if (!value) throw new Error('Choose a site')
    const sep = value.indexOf(':')
    const type = value.slice(0, sep)
    const id = value.slice(sep + 1)
    if (!id || (type !== 'site' && type !== 'layout')) throw new Error(`Unknown site option: ${value}`)
    if (type === 'site') return id

    // layout:<id> -> find or create the material_sites row linked to that layout.
    const existing = sitesRef.current.find(s => s.layout_id === id && !s.archived && s.kind !== 'warehouse')
    if (existing) return existing.id

    const layout = layoutsRef.current.find(l => l.id === id)
    if (!layout) throw new Error('That layout no longer exists')
    try {
      const { data } = await runSupabaseMutation(
        () => supabase
          .from('material_sites')
          .upsert({ name: layout.name, layout_id: id }, { onConflict: 'layout_id' })
          .select()
          .single(),
        { label: 'Link layout as material site' }
      )
      upsertLocalSite(data)
      return data.id
    } catch (err) {
      if (err?.code !== UNIQUE_VIOLATION) throw err
      // The name index tripped: a live site with this name already exists.
      const key = layout.name.trim().toLowerCase()
      let clash = sitesRef.current.find(s => !s.archived && s.name.trim().toLowerCase() === key)
      if (!clash) {
        const res = await runSupabaseRequest(
          () => supabase.from('material_sites').select('*').eq('archived', false).ilike('name', layout.name.trim().replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle(),
          { label: 'Find existing material site' }
        )
        clash = res.data
      }
      if (!clash) throw err
      // Never adopt the Warehouse as a project site.
      if (clash.kind === 'warehouse') {
        throw new Error(`A site named "${layout.name}" already exists`)
      }
      if (clash.layout_id === id) { upsertLocalSite(clash); return clash.id }
      if (clash.layout_id) {
        throw new Error(`A site named "${layout.name}" already exists for another project`)
      }
      const { data } = await runSupabaseMutation(
        () => supabase.from('material_sites').update({ layout_id: id }).eq('id', clash.id).select().single(),
        { label: 'Link existing site to layout' }
      )
      upsertLocalSite(data)
      return data.id
    }
  }, [upsertLocalSite])

  const resolveForm = useCallback(async form => {
    const siteId = text(form.siteValue) ? await resolveSiteId(form.siteValue) : null
    const fromSiteId = text(form.fromSiteValue) ? await resolveSiteId(form.fromSiteValue) : null
    return toRow(form, siteId, fromSiteId)
  }, [resolveSiteId])

  const addEntry = useCallback(async form => {
    const row = await resolveForm(form)
    const { data } = await runSupabaseMutation(
      () => supabase.from('material_entries').insert(row).select().single(),
      { label: 'Add material entry' }
    )
    if (aliveRef.current) setEntries(prev => [data, ...prev].sort(byNewest))
    return data
  }, [resolveForm])

  const updateEntry = useCallback(async (id, form) => {
    const row = await resolveForm(form)
    if (row.kind === 'out' && !row.from_site_id) {
      // The DB only defaults the source on INSERT; on UPDATE the out CHECK would fail.
      const warehouse = sitesRef.current.find(s => s.kind === 'warehouse' && !s.archived)
        ?? sitesRef.current.find(s => s.kind === 'warehouse')
      if (warehouse) row.from_site_id = warehouse.id
    }
    const { data } = await runSupabaseMutation(
      () => supabase
        .from('material_entries')
        .update(row)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single(),
      { label: 'Update material entry' }
    )
    if (aliveRef.current) setEntries(prev => prev.map(e => (e.id === id ? data : e)).sort(byNewest))
    return data
  }, [resolveForm])

  const deleteEntry = useCallback(async id => {
    await runSupabaseMutation(
      () => supabase
        .from('material_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single(),
      { label: 'Delete material entry' }
    )
    if (aliveRef.current) setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const loadHistory = useCallback(async entryId => {
    const { data } = await runSupabaseRequest(
      () => supabase
        .from('material_entry_history')
        .select('*')
        .eq('entry_id', entryId)
        .order('changed_at', { ascending: false }),
      { label: 'Load material entry history' }
    )
    return data ?? []
  }, [])

  return {
    status, error, entries, sites, layouts, reload: load,
    addEntry, updateEntry, deleteEntry, addSite, resolveSiteId, loadHistory,
  }
}
