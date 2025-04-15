import { supabase } from '@lib/supabase';
import logger from '@lib/logger';

const log = logger.createLogger('CheckTableAPI');

/**
 * API endpoint to check specific table details
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
    const { table } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    log.info(`Checking table: ${table}`);
    
    // 1. Count records in the table
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      log.error(`Error counting records in ${table}`, { error: countError });
      return res.status(500).json({ 
        error: countError.message, 
        details: countError.details,
        hint: countError.hint
      });
    }
    
    // 2. Get table schema information if available
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: table })
      .catch(() => ({ data: null, error: true }));
    
    // 3. Get sample records from the table
    const { data: sampleData, error: sampleError } = await supabase
      .from(table)
      .select('*')
      .limit(5);
    
    // 4. If calendar_posts table, check for posts without calendar_id
    let badRecords = null;
    if (table === 'calendar_posts') {
      const { data: missingCalendarId, error: missingError } = await supabase
        .from('calendar_posts')
        .select('id, created_at')
        .is('calendar_id', null)
        .limit(10);
        
      if (!missingError) {
        badRecords = {
          missingCalendarId: {
            count: missingCalendarId.length,
            records: missingCalendarId
          }
        };
      }
    }
    
    // Compile results
    const results = {
      timestamp: new Date().toISOString(),
      table,
      exists: !tableError,
      count: count,
      schema: tableInfo || null,
      sample: sampleData || [],
      badRecords
    };
    
    log.info(`Table check completed for ${table}`, {
      exists: results.exists,
      count: results.count
    });
    
    return res.status(200).json(results);
  } catch (error) {
    log.error('Error in check-table API', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 