import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create logger for Supabase operations
const log = logger.createLogger('Supabase');

// Verify these are pointing to the correct project
log.info('Initializing Supabase client', { 
  url: supabaseUrl, 
  keyProvided: !!supabaseKey,
  keyFirstChars: supabaseKey ? supabaseKey.substring(0, 5) + '...' : 'missing' 
});

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  // Add debug logging for development
  global: {
    fetch: (...args) => {
      // Log the request
      log.debug('Supabase API request', { 
        url: args[0],
        method: args[1]?.method || 'GET'
      });
      
      return fetch(...args).then(response => {
        // Log the response status
        const success = response.status >= 200 && response.status < 300;
        if (!success) {
          log.warn('Supabase API response failed', { 
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
        } else {
          log.debug('Supabase API response success', { 
            status: response.status
          });
        }
        
        // Clone the response to make it available for the caller
        return response.clone();
      }).catch(error => {
        // Log network errors
        log.error('Supabase API request failed', { 
          error: error.message,
          stack: error.stack
        });
        throw error;
      });
    }
  }
});
