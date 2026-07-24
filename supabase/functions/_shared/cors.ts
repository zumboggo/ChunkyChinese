const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://zumboggo.github.io',
])

const LOCAL_DEVELOPMENT_ORIGIN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/u

export function isRequestOriginAllowed(
  request: Request,
  configuredOrigins = '',
): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true

  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS)
  for (const configured of configuredOrigins.split(',')) {
    const normalized = configured.trim()
    if (normalized) allowedOrigins.add(normalized)
  }

  return allowedOrigins.has(origin) || LOCAL_DEVELOPMENT_ORIGIN.test(origin)
}

export function corsHeadersForRequest(
  request: Request,
  configuredOrigins = '',
): Record<string, string> {
  const origin = request.headers.get('Origin')
  return {
    ...(origin && isRequestOriginAllowed(request, configuredOrigins)
      ? { 'Access-Control-Allow-Origin': origin }
      : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
