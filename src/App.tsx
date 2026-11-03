import { AuthForm } from './AuthForm'
import { Board } from './Board'
import { Logo } from './Logo'
import { supabase } from './supabase'
import { useSession } from './useSession'

export default function App() {
  const session = useSession()

  if (session === undefined) return <p className="notice splash" role="status">Loading…</p>
  if (!session) return <AuthForm />

  return (
    <div className="app">
      <a className="skip" href="#board">Skip to board</a>
      <div className="topbar">
        <Logo />
        <h1>FlowBoard</h1>
        <span className="spacer" />
        <span className="avatar" aria-hidden="true">{session.user.email?.[0]}</span>
        <span className="user">{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      <div className="content">
        {/* keyed by user so a different account never sees the previous one's cards */}
        <Board key={session.user.id} />
      </div>
    </div>
  )
}
