import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Always use localStorage so Supabase can reliably read the session on any
// page load/refresh. "Remember Me" behaviour is handled in AuthContext —
// if remember-me is OFF we clear the session on sign-out so the user must
// log in again on next browser open.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
})
