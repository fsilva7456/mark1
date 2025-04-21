import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    // Get a sample strategy
    const { data: strategies, error } = await supabase
      .from('strategies')
      .select('*')
      .limit(1);
      
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!strategies || strategies.length === 0) {
      return res.status(404).json({ error: 'No strategies found' });
    }
    
    // Get the column names/structure
    const columnInfo = Object.keys(strategies[0]).map(key => {
      return {
        name: key,
        type: typeof strategies[0][key],
        hasValue: strategies[0][key] !== null,
        isObject: typeof strategies[0][key] === 'object' && strategies[0][key] !== null
      };
    });
    
    return res.status(200).json({ 
      sampleStrategy: strategies[0],
      columnInfo
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 