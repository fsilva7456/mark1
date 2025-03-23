import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

export default function CalendarView() {
  const router = useRouter();
  const { strategy, startDate } = router.query;
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

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

  useEffect(() => {
    // Generate calendar days for the current month
    generateCalendarDays(currentMonth);
  }, [currentMonth, events]);

  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week of first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Create array of days
    const days = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, events: [] });
    }
    
    // Add days of the month with their events
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      
      // Find events for this day
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getDate() === i && 
               eventDate.getMonth() === month && 
               eventDate.getFullYear() === year;
      });
      
      days.push({ date: currentDate, events: dayEvents });
    }
    
    setCalendarDays(days);
  };

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
      setCurrentMonth(baseDate);
      
      const calendarEvents = [];
      
      // Generate events from campaign posts
      contentPlan.campaigns.forEach((week, weekIndex) => {
        week.posts.forEach((post, postIndex) => {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + (weekIndex * 7) + postIndex);
          
          calendarEvents.push({
            id: `${weekIndex}-${postIndex}`,
            title: post.topic,
            start: eventDate,
            end: eventDate,
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
            start: eventDate,
            end: eventDate,
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
      setCurrentMonth(baseDate);
      
      const calendarEvents = [];
      
      for (let week = 0; week < mockWeeks; week++) {
        for (let post = 0; post < postsPerWeek; post++) {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + (week * 7) + post * 2); // posts every 2 days
          
          const postTypes = ['Carousel', 'Video', 'Image', 'Story', 'Reel'];
          
          calendarEvents.push({
            id: `mock-${week}-${post}`,
            title: `Content for ${strategyData?.name || 'Strategy'} - Week ${week + 1}, Post ${post + 1}`,
            start: eventDate,
            end: eventDate,
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

  const getPreviousMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date);
  };

  const getNextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date);
  };

  const getMonthName = (date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  };
  
  const getDayColor = (type) => {
    switch (type) {
      case 'Video': return '#e74c3c';
      case 'Carousel': return '#2ecc71';
      case 'Story': return '#f39c12';
      case 'Reel': return '#9b59b6';
      case 'Image': return '#1abc9c';
      default: return '#3454D1';
    }
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
                onClick={() => router.push('/marketing-plan')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className={styles.calendarContainer}>
              <div className={styles.simpleCalendar}>
                <div className={styles.calendarHeader}>
                  <button onClick={getPreviousMonth} className={styles.calendarButton}>
                    &lt; Previous
                  </button>
                  <h2>{getMonthName(currentMonth)}</h2>
                  <button onClick={getNextMonth} className={styles.calendarButton}>
                    Next &gt;
                  </button>
                </div>
                
                <div className={styles.calendarGrid}>
                  <div className={styles.weekDays}>
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                  <div className={styles.calendarDays}>
                    {calendarDays.map((day, index) => (
                      <div 
                        key={index} 
                        className={`${styles.calendarDay} ${!day.date ? styles.emptyDay : ''}`}
                      >
                        {day.date && (
                          <>
                            <div className={styles.dayNumber}>{day.date.getDate()}</div>
                            <div className={styles.dayEvents}>
                              {day.events.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className={styles.calendarEvent}
                                  style={{ backgroundColor: getDayColor(event.resource.type) }}
                                  onClick={() => handleEventClick(event)}
                                >
                                  {event.title.length > 18 ? 
                                    `${event.title.substring(0, 18)}...` : 
                                    event.title
                                  }
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedEvent && (
                <div className={styles.eventDetail}>
                  <h3>Post Details</h3>
                  <div className={styles.eventCard}>
                    <div className={styles.eventHeader}>
                      <span 
                        className={styles.eventType}
                        style={{ backgroundColor: getDayColor(selectedEvent.resource.type) }}
                      >
                        {selectedEvent.resource.type}
                      </span>
                      <span className={styles.eventWeek}>Week {selectedEvent.resource.week}</span>
                    </div>
                    <h4>{selectedEvent.title}</h4>
                    <p className={styles.eventDate}>
                      {new Intl.DateTimeFormat('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }).format(selectedEvent.start)}
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
                  href="/marketing-plan" 
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