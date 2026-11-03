import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthForm } from './AuthForm'
import { fake } from './test/fakeSupabase'

vi.mock('./supabase', async () => {
  const { fake } = await import('./test/fakeSupabase')
  return { supabase: fake.client, supabaseConfigured: true }
})

const password = () => screen.getByLabelText(/^password/i)

function setup() {
  render(<AuthForm />)
  return userEvent.setup()
}

describe('structure', () => {
  it('has a level-one heading', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to FlowBoard' })).toBeInTheDocument()
  })

  it('tells browsers and password managers what each field is', () => {
    setup()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(password()).toHaveAttribute('autocomplete', 'current-password')
  })
})

describe('password rules', () => {
  it('does not enforce a minimum when signing in, so existing short passwords still work', () => {
    setup()
    expect(password()).not.toHaveAttribute('minlength')
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
  })

  it('requires 8 characters when creating an account, and says so', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
    expect(password()).toHaveAttribute('minlength', '8')
    expect(password()).toHaveAttribute('autocomplete', 'new-password')
    const hint = screen.getByText('At least 8 characters')
    expect(password()).toHaveAttribute('aria-describedby', hint.id)
  })
})

describe('signing in', () => {
  it('sends the email and password', async () => {
    const user = setup()
    await user.type(screen.getByLabelText('Email'), 'maya@example.com')
    await user.type(password(), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maya@example.com', password: 'correct horse' })
  })

  it('shows a failure as an alert', async () => {
    fake.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    const user = setup()
    await user.type(screen.getByLabelText('Email'), 'maya@example.com')
    await user.type(password(), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })
})

describe('signing up', () => {
  async function signUp(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(password(), 'longenough1')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
  }

  it('announces the check-your-email notice politely', async () => {
    const user = setup()
    await signUp(user)
    expect(fake.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'longenough1' })
    // regression: the notice used to be a plain paragraph that screen readers never announced
    expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
  })

  it('shows a failure as an alert', async () => {
    fake.auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Password too weak' } })
    const user = setup()
    await signUp(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Password too weak')
  })
})
