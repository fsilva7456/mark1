import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Calendar.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function CalendarView() {
  const router = useRouter();
  const { strategy, startDate } = router.query;
  const { user, loading } = useAuth();
  const [calendar, setCalendar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    if (startDate && strategy) {
      setCalendarStartDate(new Date(startDate));
      generateCalendar();
    }
  }, [user, loading, startDate, strategy, router]);
  
  const generateCalendar = async () => {
    setIsLoading(true);
    
    try {
      // Fetch content outline data from API or localStorage
      // For demo, we'll create mock data
      const calendarData = generateCalendarData(new Date(startDate), strategy);
      setCalendar(calendarData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating calendar:', error);
      setIsLoading(false);
    }
  };
  
  const generateCalendarData = (startDate, strategyName) => {
    // Create a calendar for 3 weeks
    const calendar = [];
    const currentDate = new Date(startDate);
    
    // Sample content outline (in a real app, this would come from your database)
    const contentOutline = [
      {
        week: 1,
        theme: "Introduction to your approach",
        posts: [
          { type: "Carousel", topic: "5 myths about fitness debunked", day: 1 },
          { type: "Video", topic: "Quick demo of your training style", day: 3 },
          { type: "Story", topic: "Behind the scenes of your business", day: 5 }
        ]
      },
      {
        week: 2,
        theme: "Client success stories",
        posts: [
          { type: "Transformation", topic: "Before & after of a client", day: 8 },
          { type: "Testimonial", topic: "Client interview about their journey", day: 10 },
          { type: "Carousel", topic: "3 key habits that lead to success", day: 12 }
        ]
      },
      {
        week: 3,
        theme: "Education series",
        posts: [
          { type: "Carousel", topic: "The science behind your methods", day: 15 },
          { type: "Video", topic: "Common form mistakes to avoid", day: 17 },
          { type: "Reel", topic: "Quick tips for better results", day: 19 }
        ]
      }
    ];
    
    // Generate 3 weeks of dates
    for (let i = 0; i < 21; i++) {
      const date = new Date(currentDate);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find posts scheduled for this day
      const dayPosts = [];
      contentOutline.forEach(week => {
        week.posts.forEach(post => {
          if (post.day === i + 1) {
            dayPosts.push({
              type: post.type,
              topic: post.topic,
              theme: week.theme,
              week: week.week
            });
          }
        });
      });
      
      calendar.push({
        date: dateStr,
        day: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        posts: dayPosts
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return calendar;
  };
  
  // Group calendar days by week
  const calendarWeeks = [];
  for (let i = 0; i < calendar.length; i += 7) {
    calendarWeeks.push(calendar.slice(i, i + 7));
  }
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Content Calendar | Mark1</title>
        <meta name="description" content="View your content calendar" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Content Calendar for {strategy}</h1>
            <p>Starting from {calendarStartDate?.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Generating your calendar...</p>
            </div>
          ) : (
            <div className={styles.calendarContainer}>
              <div className={styles.weekdaysHeader}>
                <div>Sunday</div>
                <div>Monday</div>
                <div>Tuesday</div>
                <div>Wednesday</div>
                <div>Thursday</div>
                <div>Friday</div>
                <div>Saturday</div>
              </div>
              
              {calendarWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className={styles.calendarWeek}>
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className={styles.calendarDay}>
                      <div className={styles.dateHeader}>
                        <span className={styles.dateNumber}>{day.day}</span>
                        <span className={styles.dateMonth}>{day.month}</span>
                      </div>
                      
                      <div className={styles.postsContainer}>
                        {day.posts.map((post, postIndex) => (
                          <div key={postIndex} className={styles.calendarPost}>
                            <div className={styles.postType}>{post.type}</div>
                            <p className={styles.postTitle}>{post.topic}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
              <div className={styles.actions}>
                <button onClick={() => handleSaveCalendar()} className={styles.saveButton}>
                  Save Calendar
                </button>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className={styles.cancelButton}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 