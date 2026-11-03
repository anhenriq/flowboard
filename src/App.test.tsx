import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { fake } from './test/fakeSupabase'

vi.mock('./supabase', async () => {
  const { fake } = await import('./test/fakeSupabase')
  return { supabase: fake.client, supabaseConfigured: true }
})

const signedIn = { user: { id: 'u1', email: 'maya@example.com' } }

describe('starting up', () => {
  it('shows an announced loading message instead of a blank page', () => {
    fake.auth.getSession.mockReturnValue(new Promise(() => {}))
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('falls back to the sign-in form when the stored session cannot be restored', async () => {
    // regression: this used to leave the page blank forever
    fake.auth.getSession.mockRejectedValue(new Error('storage unavailable'))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Sign in to FlowBoard' })).toBeInTheDocument()
  })

  it('shows the sign-in form when there is no session', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Sign in to FlowBoard' })).toBeInTheDocument()
  })
})

describe('signed in', () => {
  async function setup() {
    fake.auth.getSession.mockResolvedValue({ data: { session: signedIn } })
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'FlowBoard' })
    await waitFor(() => expect(screen.queryByText('Loading cards…')).not.toBeInTheDocument())
  }

  it('shows the user, the board and a skip link that targets it', async () => {
    await setup()
    expect(screen.getByText('maya@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to board' })).toHaveAttribute('href', '#board')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'board')
  })

  it('signs out', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(fake.auth.signOut).toHaveBeenCalledOnce()
  })

  it('has exactly one level-one heading', async () => {
    await setup()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
