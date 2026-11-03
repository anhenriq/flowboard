import { useState } from 'react'
import { Logo } from './Logo'
import { supabase } from './supabase'

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      // no session means the project requires email confirmation first
      else if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
    }
    setBusy(false)
  }

  return (
    <div className="backdrop auth">
      <form className="modal" onSubmit={submit}>
        <Logo large />
        <h1>{mode === 'signin' ? 'Sign in to FlowBoard' : 'Create your account'}</h1>

        <label>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            // only enforced when creating a password, so existing shorter ones can still sign in
            minLength={mode === 'signup' ? 8 : undefined}
            aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {mode === 'signup' && <span id="password-hint" className="hint">At least 8 characters</span>}
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        <div className="actions">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
          >
            {mode === 'signin' ? 'Create account' : 'I have an account'}
          </button>
          <span className="spacer" />
          <button type="submit" className="primary" disabled={busy}>
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  )
}
