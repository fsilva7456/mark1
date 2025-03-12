import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  try {
    const { location } = req.query;
    
    // Build query based on parameters
    let query = supabase
      .from('gyms')
      .select('*');
    
    // Add location filter if provided
    if (location) {
      query = query.ilike('Localized Location in Downtown Toronto', `%${location}%`);
    }
    
    // Execute the query
    const { data, error } = await query.limit(5);
    
    if (error) throw error;
    
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching gym data:', error);
    return res.status(500).json({ error: error.message });
  }
} 