const queryCache = new Map()
const inflightQueries = new Map()

export async function getCachedQuery(key, fetcher, options = {}) {
  const ttl = options.ttl ?? 5 * 60 * 1000
  const now = Date.now()
  const cached = queryCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  if (inflightQueries.has(key)) {
    return inflightQueries.get(key)
  }

  const request = (async () => {
    try {
      const data = await fetcher()
      queryCache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
      })
      return data
    } finally {
      inflightQueries.delete(key)
    }
  })()

  inflightQueries.set(key, request)
  return request
}

export function invalidateCachedQuery(key) {
  queryCache.delete(key)
  inflightQueries.delete(key)
}
