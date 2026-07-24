import { describe, expect, it } from 'vitest'
import {
  corsHeadersForRequest,
  isRequestOriginAllowed,
} from '../supabase/functions/_shared/cors'

describe('Edge Function origin allowlist', () => {
  it('allows the production app and echoes only that origin', () => {
    const request = new Request('https://example.supabase.co/functions/v1/character-tts', {
      headers: { Origin: 'https://zumboggo.github.io' },
    })

    expect(isRequestOriginAllowed(request)).toBe(true)
    expect(corsHeadersForRequest(request)['Access-Control-Allow-Origin'])
      .toBe('https://zumboggo.github.io')
  })

  it('allows local development origins without allowing lookalike hosts', () => {
    const local = new Request('https://example.supabase.co/functions/v1/character-tts', {
      headers: { Origin: 'http://127.0.0.1:5173' },
    })
    const lookalike = new Request('https://example.supabase.co/functions/v1/character-tts', {
      headers: { Origin: 'https://zumboggo.github.io.attacker.example' },
    })

    expect(isRequestOriginAllowed(local)).toBe(true)
    expect(isRequestOriginAllowed(lookalike)).toBe(false)
    expect(corsHeadersForRequest(lookalike)).not.toHaveProperty('Access-Control-Allow-Origin')
  })

  it('supports explicit future deployment origins', () => {
    const request = new Request('https://example.supabase.co/functions/v1/generate-story', {
      headers: { Origin: 'https://learn.example.com' },
    })

    expect(isRequestOriginAllowed(request, 'https://learn.example.com')).toBe(true)
  })

  it('allows non-browser clients that do not send an Origin header', () => {
    const request = new Request('https://example.supabase.co/functions/v1/character-tts')

    expect(isRequestOriginAllowed(request)).toBe(true)
    expect(corsHeadersForRequest(request)).not.toHaveProperty('Access-Control-Allow-Origin')
  })
})
