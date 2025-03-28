import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and key from environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' // Mock key

// Verify these are pointing to the correct project
console.log('Supabase URL:', supabaseUrl)

// Create Supabase client with debug logging
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  // Add detailed logging
  global: {
    fetch: (url, options) => {
      console.log(`Supabase fetch: ${url.toString().split('?')[0]}`);
      return fetch(url, options);
    },
  },
}) 