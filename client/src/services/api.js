export async function api(path, { token, body, signal, method = 'GET' } = {}) {
  const response = await fetch(path, {
    method,
    signal,
    cache: 'no-store',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error?.message || 'The request failed. Please try again.')
    error.status = response.status
    error.code = data.error?.code
    throw error
  }
  return data
}
