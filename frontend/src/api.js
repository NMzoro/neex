const BASE = '/api'

async function request(path) {
  const response = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body.detail || detail
    } catch {
      /* r�ponse non JSON */
    }
    throw new Error(`API ${response.status} � ${detail}`)
  }
  return response.json()
}

export const api = {
  bootstrap: () => request('/bootstrap'),
  health: () => request('/health'),
  predictions: ({ outcome = 'ALL', offset = 0, limit = 12 } = {}) =>
    request(`/predictions?outcome=${outcome}&offset=${offset}&limit=${limit}`),
  feed: ({ offset = 0, limit = 8 } = {}) => request(`/supervision/feed?offset=${offset}&limit=${limit}`),
}
