const DEFAULT_BACKEND_TARGET = 'https://courier-relive-rival.ngrok-free.dev'

export default async function handler(request, response) {
  const target = process.env.BACKEND_TARGET || DEFAULT_BACKEND_TARGET
  const pathParts = Array.isArray(request.query.path)
    ? request.query.path
    : [request.query.path].filter(Boolean)
  const url = new URL(`${target.replace(/\/$/, '')}/${pathParts.join('/')}`)

  for (const [key, value] of Object.entries(request.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item))
    } else if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (!value || ['host', 'content-length'].includes(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(',') : value)
  }

  const proxiedResponse = await fetch(url, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method ?? '') ? undefined : request,
    duplex: 'half',
  })

  response.status(proxiedResponse.status)
  proxiedResponse.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
      response.setHeader(key, value)
    }
  })

  const body = Buffer.from(await proxiedResponse.arrayBuffer())
  response.send(body)
}
