import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedQuery } from '../lib/queryCache'
import { runSupabaseRequest } from '../lib/supabaseRequest'

function mapMedia(row) {
  return {
    id: row.id,
    type: row.type,
    url: row.url,
    thumbnailUrl: row.thumbnail_url || null,
    caption: row.caption || null,
    sortOrder: row.sort_order,
  }
}

export default function useLayoutMedia(layoutId) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)  // pessimistic: skeleton shows on first render

  useEffect(() => {
    if (!layoutId) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const data = await getCachedQuery(`layout-media:${layoutId}`, async () => {
          const { data: rows } = await runSupabaseRequest(
            () => supabase
              .from('layout_media')
              .select('id, type, url, thumbnail_url, caption, sort_order')
              .eq('layout_id', layoutId)
              .order('sort_order'),
            { label: 'Load layout media' }
          )
          return (rows ?? []).map(mapMedia)
        })

        if (cancelled) return
        setMedia(data)
      } catch (error) {
        if (cancelled) return
        console.error(error)
        setMedia([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [layoutId])

  return { media, loading }
}
