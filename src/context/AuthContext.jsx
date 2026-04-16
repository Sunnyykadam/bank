import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const loadingDone = useRef(false)

  const finishLoading = () => {
    if (!loadingDone.current && mountedRef.current) {
      loadingDone.current = true
      setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadingDone.current = false

    // Hard safety net — never wait more than 3 seconds
    const timeout = setTimeout(finishLoading, 3000)

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mountedRef.current) return
        if (error) {
          finishLoading()
          return
        }
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          finishLoading()
        }
      } catch (err) {
        console.error('Auth init error:', err)
        finishLoading()
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return
        if (session?.user) {
          setUser(session.user)
          // Handle both first login AND returning with stored session
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            await loadProfile(session.user.id)
          }
        } else {
          setUser(null)
          setProfile(null)
          finishLoading()
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timeout)
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
    } finally {
      finishLoading()
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
    loadingDone.current = false
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      finishLoading()
    }
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
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
