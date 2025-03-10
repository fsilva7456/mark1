import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges (use service role key)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // This should be protected with a secret key or admin authentication
  const { secretKey } = req.body;
  
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Create the table and set up RLS policies
    const { error } = await adminSupabase.rpc('setup_website_data_table');
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting up database:', error);
    return res.status(500).json({ error: error.message });
  }
} 