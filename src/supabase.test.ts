import { afterEach, describe, expect, it, vi } from 'vitest'

// This file tests the real client module, so it deliberately does not mock './supabase'.
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('supabase client module', () => {
  it('does not throw when the environment variables are missing, so a setup message can show', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.resetModules()

    // regression: it used to throw at import time, leaving a blank white page
    const mod = await import('./supabase')
    expect(mod.supabaseConfigured).toBe(false)
    expect(mod.supabase).toBeDefined()
  })

  it('reports configured when both variables are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    vi.resetModules()
    const mod = await import('./supabase')
    expect(mod.supabaseConfigured).toBe(true)
  })

  it('reports not configured when only one is set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.resetModules()
    expect((await import('./supabase')).supabaseConfigured).toBe(false)
  })
})
