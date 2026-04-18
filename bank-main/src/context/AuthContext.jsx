import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

const REMEMBER_ME_KEY = 'finpulse_remember_me'

// Helper: find and remove all Supabase session keys from localStorage
const clearSupabaseLocalStorage = () => {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('sb-') && key.includes('-auth-token')) {
      localStorage.removeItem(key)
    }
  })
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const initializedRef = useRef(false)   // guard so we only init loading once

  // Load profile in the background — never blocks auth loading
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!mountedRef.current) return

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet — create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ user_id: userId, name: 'User', bank_balance: 0, cash_balance: 0, liabilities: 0 }])
          .select()
          .single()
        if (!createError && mountedRef.current) {
          setProfile(newProfile)
        }
      } else if (!error) {
        setProfile(data)
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    }
  }

  // Resolve auth: set user + release loading, then load profile in background
  const resolveAuth = (sessionUser) => {
    if (!mountedRef.current) return
    if (sessionUser) {
      setUser(sessionUser)
      // Load profile in background — do NOT await, so loading is released immediately
      loadProfile(sessionUser.id)
    }
    setLoading(false)
    initializedRef.current = true
  }

  useEffect(() => {
    mountedRef.current = true

    // ── Safety timeout ──────────────────────────────────────────────────────
    // If something goes wrong (network error, Supabase never fires, etc.)
    // we MUST release the loading gate so the user isn't stuck forever.
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && !initializedRef.current) {
        console.warn('Auth safety timeout reached — forcing loading=false')
        setLoading(false)
        initializedRef.current = true
      }
    }, 3000)

    // ── Single source of truth: onAuthStateChange ───────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return

        if (event === 'INITIAL_SESSION') {
          resolveAuth(session?.user || null)

        } else if (event === 'SIGNED_IN' && session?.user) {
          resolveAuth(session.user)

        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          if (mountedRef.current) setLoading(false)

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    // ── Fallback: getSession for older Supabase versions ───────────────────
    const fallbackTimer = setTimeout(async () => {
      if (initializedRef.current || !mountedRef.current) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mountedRef.current || initializedRef.current) return
        resolveAuth(session?.user || null)
      } catch (err) {
        console.error('Fallback getSession error:', err)
        if (mountedRef.current && !initializedRef.current) {
          setLoading(false)
          initializedRef.current = true
        }
      }
    }, 500)

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimer)
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = async (updates) => {
    if (!user) return { error: 'No user' }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const signIn = async (email, password, rememberMe = false) => {
    setLoading(true)

    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoading(false)
      return { data, error }
    }

    // onAuthStateChange SIGNED_IN will call resolveAuth and set loading=false
    return { data, error }
  }

  const signOut = async () => {
    // If remember-me was OFF, wipe the stored session from localStorage
    // so the user must log in again on next browser open.
    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
    if (!remembered) {
      clearSupabaseLocalStorage()
    }

    await supabase.auth.signOut()
    localStorage.removeItem(REMEMBER_ME_KEY)
    setUser(null)
    setProfile(null)
  }

  const isRemembered = () => localStorage.getItem(REMEMBER_ME_KEY) === 'true'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      updateProfile,
      isRemembered,
      refreshProfile: () => user && loadProfile(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
