import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import logger from '@lib/logger';

const log = logger.createLogger('DebugLogsViewer');

/**
 * Debug logs viewer - only available in development mode
 * Provides a UI to view application logs and check Supabase connectivity
 */
export default function DebugLogsViewer() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarId, setCalendarId] = useState('');
  const [supabaseHealth, setSupabaseHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Hijack the console to capture logs
  useEffect(() => {
    // Don't run in production
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    log.info('Debug logs viewer initialized');

    // Save original console methods
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Create log capture function
    const captureLog = (level, ...args) => {
      // Call original function
      originalConsole[level](...args);

      // Add to our logs state
      setLogs(prevLogs => [
        {
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          level,
          content: args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' '),
        },
        ...prevLogs,
      ].slice(0, 100)); // Keep only the most recent 100 logs
    };

    // Override console methods
    console.log = (...args) => captureLog('log', ...args);
    console.info = (...args) => captureLog('info', ...args);
    console.warn = (...args) => captureLog('warn', ...args);
    console.error = (...args) => captureLog('error', ...args);
    console.debug = (...args) => captureLog('debug', ...args);

    // Stop loading
    setLoading(false);

    // Restore original console on cleanup
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, []);

  // Check Supabase health function
  const checkSupabaseHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);

      const url = `/api/debug/supabase-health${
        calendarId ? `?calendar_id=${encodeURIComponent(calendarId)}` : ''
      }`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check Supabase health');
      }
      
      setSupabaseHealth(data);
      log.info('Supabase health check completed', data);
    } catch (error) {
      log.error('Error checking Supabase health', { error: error.message });
      setHealthError(error.message);
    } finally {
      setHealthLoading(false);
    }
  };

  // Additional debug action
  const checkSpecificTable = async (tableName) => {
    try {
      const response = await fetch(`/api/debug/check-table?table=${tableName}`);
      const data = await response.json();
      log.info(`Table check: ${tableName}`, data);
    } catch (error) {
      log.error(`Error checking table ${tableName}`, { error: error.message });
    }
  };

  // Log level color mapping
  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'rgb(220, 38, 38)';
      case 'warn': return 'rgb(234, 179, 8)';
      case 'info': return 'rgb(59, 130, 246)';
      case 'debug': return 'rgb(168, 85, 247)';
      default: return 'rgb(107, 114, 128)';
    }
  };

  // Render production warning
  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h1>Debug Logs Viewer</h1>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem', color: '#b91c1c' }}>
          <p>This page is only available in development mode for security reasons.</p>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/">
            <a style={{ color: '#3b82f6', textDecoration: 'underline' }}>Return to Dashboard</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <Head>
        <title>Debug Logs | Mark1</title>
      </Head>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Debug Logs Viewer</h1>
        <Link href="/">
          <a style={{ color: '#3b82f6', textDecoration: 'underline' }}>Return to Dashboard</a>
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setLogs([])} 
              style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
            >
              Clear Logs
            </button>
            <button
              onClick={() => log.info('Test log message', { timestamp: new Date().toISOString() })}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
            >
              Add Test Log
            </button>
          </div>

          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '0.5rem', 
            height: '70vh', 
            overflowY: 'auto',
            backgroundColor: '#f8fafc'
          }}>
            {loading ? (
              <p style={{ padding: '1rem', textAlign: 'center' }}>Loading logs...</p>
            ) : logs.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No logs captured yet.</p>
            ) : (
              <div style={{ padding: '0.5rem' }}>
                {logs.map(log => (
                  <div 
                    key={log.id} 
                    style={{ 
                      padding: '0.5rem', 
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span style={{ 
                        padding: '0 0.25rem', 
                        backgroundColor: getLevelColor(log.level), 
                        color: 'white', 
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <pre style={{ 
                      margin: 0, 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      fontSize: '0.75rem' 
                    }}>
                      {log.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            backgroundColor: '#f8fafc',
            marginBottom: '1rem'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Supabase Health Check</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Calendar ID (optional):
                <input 
                  type="text" 
                  value={calendarId} 
                  onChange={e => setCalendarId(e.target.value)}
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.25rem', 
                    marginTop: '0.25rem' 
                  }}
                  placeholder="Enter calendar ID to check specific records"
                />
              </label>
            </div>
            
            <button 
              onClick={checkSupabaseHealth}
              disabled={healthLoading}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.25rem', 
                cursor: healthLoading ? 'not-allowed' : 'pointer',
                opacity: healthLoading ? 0.7 : 1 
              }}
            >
              {healthLoading ? 'Checking...' : 'Check Supabase Connection'}
            </button>

            {healthError && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem', 
                backgroundColor: '#fee2e2', 
                color: '#b91c1c', 
                borderRadius: '0.25rem' 
              }}>
                <p style={{ margin: 0 }}>{healthError}</p>
              </div>
            )}

            {supabaseHealth && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Results:</h3>
                <div style={{ 
                  backgroundColor: supabaseHealth.connection.status === 'OK' ? '#ecfdf5' : '#fee2e2',
                  padding: '0.5rem', 
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem' 
                }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
                    Connection: {supabaseHealth.connection.status}
                  </p>
                  {supabaseHealth.connection.error && (
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{supabaseHealth.connection.error}</p>
                  )}
                </div>

                <div style={{ 
                  backgroundColor: supabaseHealth.calendar_posts_table.exists ? '#ecfdf5' : '#fee2e2',
                  padding: '0.5rem', 
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem' 
                }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
                    calendar_posts table: {supabaseHealth.calendar_posts_table.exists ? 'Exists' : 'Not Found'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Record count: {supabaseHealth.calendar_posts_table.count}
                  </p>
                </div>

                {supabaseHealth.specific_calendar && (
                  <div style={{ 
                    backgroundColor: supabaseHealth.specific_calendar.posts_count > 0 ? '#ecfdf5' : '#fee2e2',
                    padding: '0.5rem', 
                    borderRadius: '0.25rem' 
                  }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
                      Calendar ID {supabaseHealth.specific_calendar.calendar_id}: 
                      {supabaseHealth.specific_calendar.posts_count} posts found
                    </p>
                    {supabaseHealth.specific_calendar.error && (
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c' }}>
                        Error: {supabaseHealth.specific_calendar.error}
                      </p>
                    )}
                  </div>
                )}

                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#4b5563' }}>View Raw Response</summary>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    backgroundColor: '#f1f5f9', 
                    padding: '0.5rem', 
                    borderRadius: '0.25rem',
                    overflowX: 'auto',
                    fontSize: '0.75rem'
                  }}>
                    {JSON.stringify(supabaseHealth, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            backgroundColor: '#f8fafc'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Common Debug Tasks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => checkSpecificTable('calendars')}
                style={{ 
                  padding: '0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem', 
                  cursor: 'pointer',
                  textAlign: 'left' 
                }}
              >
                Check 'calendars' Table
              </button>
              <button 
                onClick={() => checkSpecificTable('calendar_posts')}
                style={{ 
                  padding: '0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem', 
                  cursor: 'pointer',
                  textAlign: 'left'  
                }}
              >
                Check 'calendar_posts' Table
              </button>
              <button 
                onClick={() => router.push('/calendar/view')}
                style={{ 
                  padding: '0.5rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem', 
                  cursor: 'pointer',
                  textAlign: 'left'  
                }}
              >
                Go to Calendar List View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 