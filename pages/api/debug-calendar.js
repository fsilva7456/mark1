import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const { calendarId } = req.query;
    
    // Fetch the calendar
    const { data: calendar, error: calendarError } = await supabase
      .from('calendars')
      .select('*')
      .eq('id', calendarId)
      .single();
    
    if (calendarError) {
      return res.status(500).json({ error: `Calendar error: ${calendarError.message}` });
    }
    
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }
    
    // Fetch all strategies with this ID to see if there are multiple
    const { data: strategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('id, created_at, updated_at')
      .eq('id', calendar.strategy_id);
      
    if (strategiesError) {
      return res.status(500).json({ error: `Strategy error: ${strategiesError.message}` });
    }
    
    return res.status(200).json({
      calendar: {
        id: calendar.id,
        name: calendar.name,
        strategy_id: calendar.strategy_id,
        created_at: calendar.created_at
      },
      strategiesCount: strategies.length,
      strategies: strategies
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 