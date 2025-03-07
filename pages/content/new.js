import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Content.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function NewContent() {
  const router = useRouter();
  const { strategy } = router.query;
  const { user, loading } = useAuth();
  const [contentOutline, setContentOutline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [loadingWeeks, setLoadingWeeks] = useState({
    1: true,
    2: true,
    3: true
  });
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    if (strategy) {
      // Generate content ideas based on the strategy
      generateContentIdeas();
    }
  }, [user, loading, strategy, router]);
  
  const generateContentIdeas = async () => {
    setIsLoading(true);
    
    try {
      // Generate week 1 first for faster perceived performance
      const week1 = await generateWeekContent(1, "Introduction to your approach");
      setContentOutline(prev => [...prev, week1]);
      setLoadingWeeks(prev => ({...prev, 1: false}));
      
      // Generate weeks 2 and 3 in parallel
      const [week2, week3] = await Promise.all([
        generateWeekContent(2, "Client success stories"),
        generateWeekContent(3, "Education series")
      ]);
      
      setContentOutline(prev => [...prev, week2, week3]);
      setLoadingWeeks({1: false, 2: false, 3: false});
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating content:", error);
      setIsLoading(false);
    }
  };

  // Function to generate content for a single week (one Gemini API call per week)
  const generateWeekContent = async (weekNumber, theme) => {
    // In production, you would make a single API call to Gemini for this week
    // For example:
    // const response = await fetch('your-gemini-api-endpoint', {
    //   method: 'POST',
    //   body: JSON.stringify({ 
    //     weekNumber, 
    //     theme, 
    //     strategy,
    //     prompt: `Generate a week of content for a ${theme} theme for a fitness business.` 
    //   })
    // });
    // return await response.json();
    
    // For simulation purposes, we'll return mock data immediately with minimal delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const weekContent = mockContent.find(week => week.week === weekNumber);
        resolve(weekContent);
      }, 300); // Reduced timeout to 300ms for simulation
    });
  };
  
  const handleSaveCalendar = async () => {
    try {
      // Create a new calendar in Supabase
      const { data, error } = await supabase
        .from('calendars')
        .insert([
          { 
            user_id: user.id,
            name: `Content Calendar for ${strategy}`,
            posts_scheduled: contentOutline.reduce((total, week) => total + week.posts.length, 0),
            progress: 0
          }
        ]);
      
      if (error) throw error;
      
      router.push('/dashboard?success=calendar-created');
    } catch (error) {
      console.error('Error saving calendar:', error);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Content Outline | Mark1</title>
        <meta name="description" content="Create a content outline for your fitness business" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Content Outline for {strategy}</h1>
            <p>Here's a 3-week content plan based on your marketing strategy.</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Generating your content outline...</p>
            </div>
          ) : (
            <div className={styles.outlineContainer}>
              {contentOutline.map((week, weekIndex) => (
                <div key={weekIndex} className={styles.weekSection}>
                  <h2>Week {week.week}: {week.theme}</h2>
                  <div className={styles.postsGrid}>
                    {week.posts.map((post, postIndex) => (
                      <div key={postIndex} className={styles.postCard}>
                        <div className={styles.postType}>{post.type}</div>
                        <p className={styles.postTopic}>{post.topic}</p>
                        
                        <div className={styles.postMeta}>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Audience:</span>
                            <span className={styles.metaValue}>{post.audience}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>CTA:</span>
                            <span className={styles.metaValue}>{post.cta}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Principle:</span>
                            <span className={styles.metaValue}>{post.principle}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Why it works:</span>
                            <span className={styles.metaValue}>{post.principleExplanation}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Proposed visual:</span>
                            <span className={styles.metaValue}>{post.visual}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Show loading placeholders for weeks not yet loaded */}
              {loadingWeeks[1] && <WeekLoadingPlaceholder weekNumber={1} theme="Introduction to your approach" />}
              {loadingWeeks[2] && <WeekLoadingPlaceholder weekNumber={2} theme="Client success stories" />}
              {loadingWeeks[3] && <WeekLoadingPlaceholder weekNumber={3} theme="Education series" />}
              
              <div className={styles.datePickerContainer}>
                <h3>When would you like to start publishing?</h3>
                <div className={styles.datePicker}>
                  <label htmlFor="start-date">Start Date:</label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate instanceof Date ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className={styles.dateInput}
                  />
                </div>
              </div>
              
              <div className={styles.actions}>
                <button onClick={handleSaveCalendar} className={styles.saveButton}>
                  Save Content Calendar
                </button>
                <button 
                  onClick={() => router.push(
                    `/calendar/view?strategy=${encodeURIComponent(strategy)}&startDate=${startDate.toISOString()}`
                  )} 
                  className={styles.calendarButton}
                >
                  Create Calendar View
                </button>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 