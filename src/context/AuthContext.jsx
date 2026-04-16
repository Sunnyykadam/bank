import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const sessionActive = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    // No persisted sessions — just mark loading as done immediately
    // User starts as logged out, login will set the user
    setLoading(false)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        // Only react to explicit sign-in and sign-out events
        if (event === 'SIGNED_IN' && session?.user) {
          sessionActive.current = true
          setUser(session.user)
          await loadProfile(session.user.id)
          if (mountedRef.current) setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          sessionActive.current = false
          setUser(null)
          setProfile(null)
        }
        // Ignore INITIAL_SESSION, TOKEN_REFRESHED, and other events
        // since we don't persist sessions
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!mountedRef.current) return

      if (error && error.code === 'PGRST116') {
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

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
    }
    // On success, onAuthStateChange SIGNED_IN will fire → sets user + loads profile
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    sessionActive.current = false
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, updateProfile, refreshProfile: () => user && loadProfile(user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
