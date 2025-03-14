import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

// Setup the localizer
const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const router = useRouter();
  const { strategy, startDate } = router.query;
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // Fetch calendar content when strategy ID is available
    if (strategy && user && router.isReady) {
      fetchCalendarContent(strategy);
    }
  }, [strategy, user, loading, router]);

  const fetchCalendarContent = async (strategyId) => {
    try {
      setIsLoading(true);
      
      // Fetch strategy details
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (strategyError) throw strategyError;
      
      // Fetch content plan for this strategy
      const { data: contentPlanData, error: contentPlanError } = await supabase
        .from('content_plans')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (contentPlanError) throw contentPlanError;
      
      if (!contentPlanData || contentPlanData.length === 0) {
        // If no content plan exists, generate events from mock data
        generateEventsFromMockData(strategyData);
      } else {
        // Generate events from content plan
        generateEventsFromContentPlan(contentPlanData[0]);
      }
    } catch (err) {
      console.error('Error fetching calendar content:', err);
      setError('Failed to load calendar content.');
      setIsLoading(false);
    }
  };

  const generateEventsFromContentPlan = (contentPlan) => {
    try {
      if (!contentPlan.campaigns) {
        throw new Error('No campaign data found in content plan');
      }
      
      const baseDate = startDate ? new Date(startDate) : new Date();
      const calendarEvents = [];
      
      // Generate events from campaign posts
      contentPlan.campaigns.forEach((week, weekIndex) => {
        week.posts.forEach((post, postIndex) => {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + (weekIndex * 7) + postIndex);
          
          calendarEvents.push({
            id: `${weekIndex}-${postIndex}`,
            title: post.topic,
            start: new Date(eventDate),
            end: new Date(eventDate),
            allDay: true,
            resource: {
              type: post.type,
              audience: post.audience,
              week: weekIndex + 1,
              postIndex: postIndex
            }
          });
        });
      });
      
      // Add daily engagement posts if available
      if (contentPlan.daily_engagement) {
        contentPlan.daily_engagement.forEach((post) => {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + ((post.week - 1) * 7) + post.day - 1);
          
          calendarEvents.push({
            id: `daily-${post.week}-${post.day}`,
            title: post.description,
            start: new Date(eventDate),
            end: new Date(eventDate),
            allDay: true,
            resource: {
              type: post.contentType,
              audience: post.targetAudience,
              week: post.week,
              day: post.day,
              isDailyEngagement: true
            }
          });
        });
      }
      
      setEvents(calendarEvents);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating events from content plan:', error);
      setError('Failed to generate calendar events from content plan.');
      setIsLoading(false);
    }
  };

  const generateEventsFromMockData = (strategyData) => {
    try {
      // Create mock content for demonstration
      const mockWeeks = 3;
      const postsPerWeek = 3;
      const baseDate = startDate ? new Date(startDate) : new Date();
      const calendarEvents = [];
      
      for (let week = 0; week < mockWeeks; week++) {
        for (let post = 0; post < postsPerWeek; post++) {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + (week * 7) + post * 2); // posts every 2 days
          
          const postTypes = ['Carousel', 'Video', 'Image', 'Story', 'Reel'];
          
          calendarEvents.push({
            id: `mock-${week}-${post}`,
            title: `Content for ${strategyData?.name || 'Strategy'} - Week ${week + 1}, Post ${post + 1}`,
            start: new Date(eventDate),
            end: new Date(eventDate),
            allDay: true,
            resource: {
              type: postTypes[Math.floor(Math.random() * postTypes.length)],
              audience: strategyData?.target_audience?.[0] || 'General audience',
              week: week + 1,
              postIndex: post
            }
          });
        }
      }
      
      setEvents(calendarEvents);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating mock events:', error);
      setError('Failed to generate calendar events.');
      setIsLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3454D1'; // Default blue
    
    // Different colors based on post type
    switch (event.resource?.type) {
      case 'Video':
        backgroundColor = '#e74c3c'; // Red
        break;
      case 'Carousel':
        backgroundColor = '#2ecc71'; // Green
        break;
      case 'Story':
        backgroundColor = '#f39c12'; // Orange
        break;
      case 'Reel':
        backgroundColor = '#9b59b6'; // Purple
        break;
      case 'Image':
        backgroundColor = '#1abc9c'; // Teal
        break;
    }
    
    // Daily engagement posts get a different style
    if (event.resource?.isDailyEngagement) {
      backgroundColor = '#3498db'; // Light blue
    }
    
    return {
      style: {
        backgroundColor,
        border: '0',
        borderRadius: '4px',
        opacity: 0.9,
        color: '#fff',
        display: 'block',
        fontWeight: '600',
        padding: '3px 6px'
      }
    };
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Calendar View | Mark1</title>
        <meta name="description" content="View your content calendar" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Content Calendar View</h1>
            <p>Visualize your content plan on a calendar</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading your calendar...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => router.push('/dashboard')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className={styles.calendarContainer}>
              <div className={styles.calendarWrapper}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 600 }}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'agenda']}
                  defaultView="month"
                  defaultDate={startDate ? new Date(startDate) : new Date()}
                />
              </div>
              
              {selectedEvent && (
                <div className={styles.eventDetail}>
                  <h3>Post Details</h3>
                  <div className={styles.eventCard}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventType}>{selectedEvent.resource.type}</span>
                      <span className={styles.eventWeek}>Week {selectedEvent.resource.week}</span>
                    </div>
                    <h4>{selectedEvent.title}</h4>
                    <p className={styles.eventDate}>
                      {moment(selectedEvent.start).format('dddd, MMMM D, YYYY')}
                    </p>
                    <p className={styles.eventAudience}>
                      <strong>Audience:</strong> {selectedEvent.resource.audience}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className={styles.closeButton}
                  >
                    Close
                  </button>
                </div>
              )}
              
              <div className={styles.calendarActions}>
                <button
                  onClick={() => router.back()}
                  className={styles.backButton}
                >
                  Back to Content Outline
                </button>
                <Link 
                  href="/dashboard" 
                  className={styles.dashboardButton}
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 