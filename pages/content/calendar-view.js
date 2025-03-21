import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import styles from '../../styles/Content.module.css';
import toast, { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Set up localizer for calendar
const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewType, setViewType] = useState('calendar'); // 'calendar' or 'list'
  const [selectedPost, setSelectedPost] = useState(null);
  const [user, setUser] = useState(null);

  // Check for login and fetch calendar data
  useEffect(() => {
    async function checkLoginAndFetchData() {
      // Check for user session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error('Please login to view your content calendar');
        router.push('/login');
        return;
      }
      
      setUser(sessionData.session.user);
      
      // Get calendar ID from URL query
      const { id } = router.query;
      
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch calendar data from Supabase
        const { data, error } = await supabase
          .from('calendars')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }
        
        if (!data) {
          console.error('Calendar not found with ID:', id);
          toast.error('Calendar not found');
          setLoading(false);
          return;
        }
        
        console.log('Successfully loaded calendar data:', data.id);
        setCalendarData(data);
        
        // Parse posts data from JSON
        if (data.posts) {
          console.log('Processing calendar posts data...');
          const parsedPosts = typeof data.posts === 'string' 
            ? JSON.parse(data.posts) 
            : data.posts;
          
          console.log(`Found ${parsedPosts.length} posts in calendar`);
          
          // Convert to calendar events format
          const events = parsedPosts.map(post => ({
            id: Math.random().toString(36).substring(2, 9),
            title: `${post.type}: ${post.title}`,
            start: new Date(post.scheduledDate),
            end: new Date(new Date(post.scheduledDate).getTime() + 60 * 60 * 1000), // 1 hour duration
            resource: post
          }));
          
          // Sort events by date
          events.sort((a, b) => a.start - b.start);
          
          setCalendarEvents(events);
        } else {
          console.warn('No posts data found in calendar');
        }
        
      } catch (error) {
        console.error('Error fetching calendar:', error);
        console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        toast.error(`Failed to load calendar data: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
    
    if (router.isReady) {
      checkLoginAndFetchData();
    }
  }, [router.isReady, router.query]);

  // Handle event selection
  const handleSelectEvent = (event) => {
    setSelectedPost(event.resource);
  };

  // Handle close post details
  const handleCloseDetails = () => {
    setSelectedPost(null);
  };

  // Handle calendar view change
  const handleViewChange = (newView) => {
    setViewType(newView);
  };

  // Handle navigation back to parameters
  const handleBack = () => {
    router.push('/content/calendar-params');
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!calendarEvents || calendarEvents.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    try {
      // Create CSV content
      const headers = ['Title', 'Content', 'Type', 'Audience', 'Channel', 'Date', 'Time'];
      
      const rows = calendarEvents.map(event => {
        const post = event.resource;
        const date = new Date(post.scheduledDate);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString();
        
        return [
          post.title,
          post.content || '',
          post.type || '',
          post.audience || '',
          post.channel || '',
          formattedDate,
          formattedTime
        ].map(field => {
          // Escape quotes in CSV fields
          if (typeof field === 'string' && field.includes('"')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return `"${field}"`;
        }).join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `content_calendar_${moment().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Calendar exported successfully');
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Failed to export calendar');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Loading Calendar | Content Calendar</title>
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your content calendar...</p>
        </div>
      </div>
    );
  }

  if (!calendarData && router.isReady) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Calendar Not Found | Content Calendar</title>
        </Head>
        <div className={styles.errorContainer}>
          <h2>Calendar Not Found</h2>
          <p>The calendar you're looking for doesn't exist or you don't have permission to view it.</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/content')}
          >
            Go to Content Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  const calendarComponents = {
    eventWrapper: ({ event, children }) => {
      const bgColor = getPlatformColor(event.resource?.channel || '');
      return (
        <div style={{
          backgroundColor: bgColor,
          border: '1px solid ' + getDarkerColor(bgColor),
          borderRadius: '4px',
          color: '#fff',
          height: '100%',
          width: '100%'
        }}>
          {children}
        </div>
      );
    }
  };
  
  // Helper function to get platform color
  function getPlatformColor(platform) {
    const colors = {
      instagram: '#C13584',
      facebook: '#3b5998',
      twitter: '#1DA1F2',
      linkedin: '#0077B5',
      tiktok: '#000000',
      youtube: '#FF0000',
      pinterest: '#E60023',
      default: '#6B7280'
    };
    
    const normalizedPlatform = platform.toLowerCase();
    return colors[normalizedPlatform] || colors.default;
  }
  
  // Helper function to get darker color for border
  function getDarkerColor(hexColor) {
    // Simple function to darken a hex color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    const darkenFactor = 0.2;
    
    const newR = Math.floor(r * (1 - darkenFactor));
    const newG = Math.floor(g * (1 - darkenFactor));
    const newB = Math.floor(b * (1 - darkenFactor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Content Calendar | Your Social Media Plan</title>
      </Head>
      
      <Toaster position="top-center" />
      
      <header className={styles.header}>
        <h1>Your Content Calendar</h1>
        <div className={styles.headerActions}>
          <button 
            className={styles.backButton}
            onClick={() => {
              // Try to get the strategy ID from localStorage
              const strategyId = localStorage.getItem('lastStrategyId');
              if (strategyId) {
                router.push(`/content/new?strategy=${strategyId}`);
              } else {
                router.push('/dashboard');
              }
            }}
          >
            Back to Content Outline
          </button>
          <button 
            className={styles.actionButton}
            onClick={handleExport}
          >
            Export to CSV
          </button>
        </div>
      </header>
      
      <div className={styles.viewToggle}>
        <button 
          className={`${styles.viewButton} ${viewType === 'calendar' ? styles.activeView : ''}`}
          onClick={() => handleViewChange('calendar')}
        >
          Calendar View
        </button>
        <button 
          className={`${styles.viewButton} ${viewType === 'list' ? styles.activeView : ''}`}
          onClick={() => handleViewChange('list')}
        >
          List View
        </button>
      </div>
      
      <div className={styles.calendarContainer}>
        {viewType === 'calendar' ? (
          <div className={styles.calendar}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              views={['month', 'week', 'day']}
              defaultView="month"
              onSelectEvent={handleSelectEvent}
              components={calendarComponents}
            />
          </div>
        ) : (
          <div className={styles.listView}>
            <div className={styles.listHeader}>
              <div className={styles.listCell}>Date & Time</div>
              <div className={styles.listCell}>Platform</div>
              <div className={styles.listCell}>Type</div>
              <div className={styles.listCell}>Title</div>
              <div className={styles.listCell}>Audience</div>
            </div>
            
            {calendarEvents.sort((a, b) => a.start - b.start).map(event => (
              <div 
                key={event.id} 
                className={styles.listRow}
                onClick={() => handleSelectEvent(event)}
              >
                <div className={styles.listCell}>
                  {moment(event.start).format('MMM DD, YYYY')}
                  <br />
                  <span className={styles.listTime}>
                    {moment(event.start).format('h:mm A')}
                  </span>
                </div>
                <div 
                  className={styles.platformBadge}
                  style={{ 
                    backgroundColor: getPlatformColor(event.resource.channel),
                    color: 'white'
                  }}
                >
                  {event.resource.channel}
                </div>
                <div className={styles.listCell}>{event.resource.type}</div>
                <div className={styles.listCell}>{event.resource.title}</div>
                <div className={styles.listCell}>{event.resource.audience || 'All'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedPost && (
        <div className={styles.postDetailOverlay}>
          <div className={styles.postDetailCard}>
            <button 
              className={styles.closeButton}
              onClick={handleCloseDetails}
            >
              ×
            </button>
            
            <h3 className={styles.postTitle}>{selectedPost.title}</h3>
            
            <div className={styles.postMetadata}>
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Platform:</span>
                <span 
                  className={styles.platformBadge}
                  style={{ 
                    backgroundColor: getPlatformColor(selectedPost.channel),
                    color: 'white'
                  }}
                >
                  {selectedPost.channel}
                </span>
              </div>
              
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Date:</span>
                <span>{moment(selectedPost.scheduledDate).format('MMMM DD, YYYY')}</span>
              </div>
              
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Time:</span>
                <span>{moment(selectedPost.scheduledDate).format('h:mm A')}</span>
              </div>
              
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Content Type:</span>
                <span>{selectedPost.type}</span>
              </div>
              
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>Target Audience:</span>
                <span>{selectedPost.audience || 'All'}</span>
              </div>
            </div>
            
            <div className={styles.postContent}>
              <h4>Content Summary:</h4>
              <p>{selectedPost.content || 'No content summary available.'}</p>
            </div>
            
            {selectedPost.cta && (
              <div className={styles.postCta}>
                <h4>Call to Action:</h4>
                <p>{selectedPost.cta}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 