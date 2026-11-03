import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary, Fatal } from './Fatal'
import { supabaseConfigured } from './supabase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    ) : (
      <Fatal title="FlowBoard isn't configured yet">
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart the dev server.
        </p>
      </Fatal>
    )}
  </StrictMode>,
)
