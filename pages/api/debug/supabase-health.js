import { supabase } from '@lib/supabase';
import logger from '@lib/logger';

const log = logger.createLogger('SupabaseHealthAPI');

/**
 * API endpoint to check Supabase connectivity and debug table structure
 * Only accessible in development mode for security
 * @param {object} req - Next.js request object
 * @param {object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow in development or with authorization in production
  if (process.env.NODE_ENV === 'production') {
    // In production, require a secret key to access
    const { authorization } = req.headers;
    if (!authorization || authorization !== `Bearer ${process.env.SUPABASE_DEBUG_SECRET_KEY}`) {
      log.warn('Unauthorized access attempt to debug endpoint', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // 1. Test basic connection with a simple query
    log.info('Testing Supabase connection');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('___fake_table_for_connection_test')
      .select('*')
      .limit(1)
      .catch(err => {
        // This should error but we want to make sure it's the right error
        return { data: null, error: err };
      });

    // If error is anything other than "relation does not exist", there's a connection issue
    const connectionStatus = connectionError && 
      connectionError.message && 
      connectionError.message.includes('relation') ? 'OK' : 'FAILED';

    // 2. Check calendar_posts table
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'calendar_posts' })
      .catch(() => ({ data: null, error: true }));
    
    // 3. Count records in calendar_posts table
    const { count, error: countError } = await supabase
      .from('calendar_posts')
      .select('*', { count: 'exact', head: true });

    // 4. Get sample records if any exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('calendar_posts')
      .select('*')
      .limit(3);

    // 5. Test for specific calendar ID
    const calendarId = req.query.calendar_id;
    let calendarPosts = null;
    let calendarPostsError = null;
    
    if (calendarId) {
      log.info(`Testing posts for specific calendar ID: ${calendarId}`);
      const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('calendar_id', calendarId)
        .limit(10);
        
      calendarPosts = data;
      calendarPostsError = error;
    }

    // Compile results
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      connection: {
        status: connectionStatus,
        error: connectionError ? connectionError.message : null
      },
      calendar_posts_table: {
        exists: !tableError,
        info: tableInfo,
        count: countError ? 'Error fetching count' : count,
        sample: sampleData || [],
        sampleError: sampleError ? sampleError.message : null
      }
    };
    
    // Add calendar-specific data if requested
    if (calendarId) {
      results.specific_calendar = {
        calendar_id: calendarId,
        posts_count: calendarPosts?.length || 0,
        posts: calendarPosts,
        error: calendarPostsError ? calendarPostsError.message : null
      };
    }

    log.info('Supabase health check completed', {
      connection: results.connection.status,
      tableExists: results.calendar_posts_table.exists,
      count: results.calendar_posts_table.count
    });
    
    return res.status(200).json(results);
  } catch (error) {
    log.error('Error in supabase health check', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 