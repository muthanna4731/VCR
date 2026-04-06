import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedQuery } from '../lib/queryCache'
import { runSupabaseRequest } from '../lib/supabaseRequest'

function mapCity(row) {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    sortOrder: row.sort_order,
  }
}

function mapLayout(row) {
  return {
    id: row.id,
    cityId: row.city_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    layoutImageUrl: row.layout_image_url,
    cardImageUrl: row.card_image_url,
    address: row.address,
    isPublished: row.is_published,
    legalDocUrl: row.legal_doc_url,
  }
}

function computeStats(plots) {
  const available = plots.filter(p => p.status === 'available').length
  const minPrice = plots.length > 0 ? Math.min(...plots.map(p => p.price_per_sqft)) : 0
  return { total: plots.length, available, minPrice }
}

/**
 * Fetches cities + published layouts + lightweight plot stats for PropertiesPage.
 * Layouts are returned with .stats and .city already attached.
 */
export default function useProperties() {
  const [cities, setCities] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
        setError(null)
      try {
        const data = await getCachedQuery('properties:index', async () => {
          const [citiesRes, layoutsRes, plotsRes] = await Promise.all([
            runSupabaseRequest(
              () => supabase.from('cities').select('id, name, state, sort_order').order('sort_order'),
              { label: 'Load cities' }
            ),
            runSupabaseRequest(
              () => supabase
                .from('site_layouts')
                .select('id, city_id, name, slug, description, layout_image_url, card_image_url, address, is_published, legal_doc_url')
                .eq('is_published', true)
                .order('name'),
              { label: 'Load published layouts' }
            ),
            // Only the fields needed for stats — keeps payload small
            runSupabaseRequest(
              () => supabase.from('plots').select('id, layout_id, status, price_per_sqft'),
              { label: 'Load plot stats' }
            ),
          ])

          const mappedCities = citiesRes.data.map(mapCity)
          const citiesById = Object.fromEntries(mappedCities.map(c => [c.id, c]))

          const plotsByLayoutId = {}
          for (const plot of plotsRes.data) {
            if (!plotsByLayoutId[plot.layout_id]) plotsByLayoutId[plot.layout_id] = []
            plotsByLayoutId[plot.layout_id].push(plot)
          }

          const mappedLayouts = layoutsRes.data.map(row => ({
            ...mapLayout(row),
            stats: computeStats(plotsByLayoutId[row.id] || []),
            city: citiesById[row.city_id] || null,
          }))

          return { cities: mappedCities, layouts: mappedLayouts }
        })

        if (cancelled) return

        setCities(data.cities)
        setLayouts(data.layouts)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { cities, layouts, loading, error }
}
