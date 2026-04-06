import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router'

const FILTER_KEYS = ['city', 'facing', 'dimensions', 'status']

/**
 * Syncs filter state with URL query params for shareable links.
 * @returns {[Record<string, string>, (filters: Record<string, string>) => void]}
 */
export default function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const result = {}
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key)
      if (value) result[key] = value
    }
    return result
  }, [searchParams])

  const setFilters = useCallback((newFilters) => {
    const params = new URLSearchParams()
    for (const key of FILTER_KEYS) {
      if (newFilters[key]) {
        params.set(key, newFilters[key])
      }
    }
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  return [filters, setFilters]
}
