const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_READ_RETRIES = 1

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(error) {
  const message = String(error?.message || '').toLowerCase()

  return (
    error?.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch')
  )
}

async function withTimeout(task, timeoutMs, label) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([task(), timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function runSupabaseRequest(task, options = {}) {
  const {
    label = 'Supabase request',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_READ_RETRIES,
    retryDelayMs = 350,
  } = options

  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await withTimeout(task, timeoutMs, label)

      if (result?.error) {
        throw result.error
      }

      return result
    } catch (error) {
      lastError = error

      if (attempt >= retries || !isRetryableError(error)) {
        throw error
      }

      await delay(retryDelayMs * (attempt + 1))
    }
  }

  throw lastError
}

export async function runSupabaseMutation(task, options = {}) {
  return runSupabaseRequest(task, {
    retries: 0,
    label: 'Supabase mutation',
    ...options,
  })
}
