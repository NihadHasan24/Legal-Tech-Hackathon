export const apiUrl = (path) => `${(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')}${path}`

export async function api(path, { token, body, audio, headers, signal, method = 'GET' } = {}) {
  const response = await fetch(apiUrl(path), {
    method,
    signal,
    cache: 'no-store',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(audio ? { 'content-type': audio.type } : {}),
      ...headers,
    },
    body: audio ?? (body ? JSON.stringify(body) : undefined),
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error?.message || 'The request failed. Please try again.')
    error.status = response.status
    error.code = data.error?.code
    error.data = data
    throw error
  }
  return data
}
