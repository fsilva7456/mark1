import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  console.log('AuthProvider rendering...');
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log('AuthProvider effect: Setting up session/auth listener...');
    let authListener = null;

    // Get current session using v2 API
    const getSession = async () => {
      try {
        console.log('AuthProvider: Attempting supabase.auth.getSession()');
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('AuthProvider: Error getting session:', error.message);
          throw error;
        }
        console.log('AuthProvider: getSession successful, session data:', data.session);
        setUser(data.session?.user ?? null)
      } catch (err) {
        console.error('AuthProvider: Exception during getSession:', err);
        setUser(null); // Ensure user is null on error
      } finally {
        setLoading(false)
        console.log('AuthProvider: Initial session check complete, loading set to false.');
      }
    }
    
    getSession()

    // Set up auth state change listener using v2 API
    console.log('AuthProvider: Setting up onAuthStateChange listener.');
    const { data: listenerData } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthProvider: onAuthStateChange triggered. Event:', event, 'Session:', session);
        setUser(session?.user ?? null)
        setLoading(false) // Ensure loading is false after state change too
      }
    )
    authListener = listenerData;

    // Cleanup function
    return () => {
      if (authListener?.subscription) {
        console.log('AuthProvider effect cleanup: Unsubscribing from auth state changes.');
        authListener.subscription.unsubscribe()
      } else {
        console.log('AuthProvider effect cleanup: No auth subscription to unsubscribe.');
      }
    }
  }, []) // Empty dependency array ensures this runs only once on mount

  // Use v2 API methods for auth operations
  const value = {
    signUp: async (email, password) => {
      console.log('AuthProvider: signUp called for', email);
      try {
        const response = await supabase.auth.signUp({ email, password });
        if (response.error) console.error('AuthProvider: SignUp error:', response.error.message);
        return response;
      } catch (err) {
        console.error('AuthProvider: SignUp exception:', err);
        return { data: null, error: err };
      }
    },
    signIn: async (email, password) => {
      console.log('AuthProvider: signIn called for', email);
       try {
        const response = await supabase.auth.signInWithPassword({ email, password });
         if (response.error) console.error('AuthProvider: SignIn error:', response.error.message);
        return response;
      } catch (err) {
         console.error('AuthProvider: SignIn exception:', err);
         return { data: null, error: err };
      }
    },
    signInWithOAuth: async (options) => {
      console.log('AuthProvider: signInWithOAuth called with options:', options);
       try {
        const response = await supabase.auth.signInWithOAuth(options);
         if (response.error) console.error('AuthProvider: OAuth SignIn error:', response.error.message);
        return response;
      } catch (err) {
         console.error('AuthProvider: OAuth SignIn exception:', err);
         return { data: null, error: err };
      }
    },
    signOut: async () => {
      console.log('AuthProvider: signOut called.');
      try {
        await supabase.auth.signOut()
        // User state will be set to null via onAuthStateChange listener
        console.log('AuthProvider: supabase.auth.signOut() successful.');
        // Only run router.push on the client side
        if (typeof window !== 'undefined') {
          console.log('AuthProvider: Navigating to / on sign out.');
          router.push('/')
        }
      } catch (err) {
        console.error('AuthProvider: SignOut exception:', err);
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