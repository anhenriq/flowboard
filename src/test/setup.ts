import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { fake } from './fakeSupabase'

beforeEach(() => {
  fake.reset()
  // a test that forgets to mock Supabase would otherwise reach the network; fail loudly instead
  vi.stubGlobal('fetch', () => {
    throw new Error('Unexpected network call: mock Supabase in this test')
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
