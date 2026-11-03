import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// main.tsx shows a setup message instead of the app when this is false
export const supabaseConfigured = Boolean(url && key)

// placeholders keep the import from throwing so the setup message can render
export const supabase = createClient(url || 'http://localhost', key || 'missing-key')
