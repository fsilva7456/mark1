import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get current session using v2 API
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user ?? null)
      setLoading(false)
      
      // Set up auth state change listener using v2 API
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )
      
      return () => {
        authListener?.subscription.unsubscribe()
      }
    }
    
    getSession()
  }, [])

  // Use v2 API methods for auth operations
  const value = {
    signUp: (email, password) => 
      supabase.auth.signUp({ email, password }),
    signIn: (email, password) => 
      supabase.auth.signInWithPassword({ email, password }),
    signOut: async () => {
      await supabase.auth.signOut()
      // Only run router.push on the client side
      if (typeof window !== 'undefined') {
        router.push('/')
      }
    },
    user,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
} 