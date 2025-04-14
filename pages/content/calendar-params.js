import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Youtube, 
  TikTok
} from '../../components/icons/SocialIcons';
import styles from '../../styles/Calendar.module.css';

export default function CalendarParams() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [contentOutline, setContentOutline] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [error, setError] = useState('');
  
  // Calendar parameters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [postFrequency, setPostFrequency] = useState('moderate');
  const [postDays, setPostDays] = useState(['Monday', 'Wednesday', 'Friday']);
  const [postTime, setPostTime] = useState('09:00');
  const [selectedChannels, setSelectedChannels] = useState(['instagram', 'facebook']);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Page initialization
  useEffect(() => {
    // Check for login
    if (!authLoading && !user) {
      toast.error('Please login to continue');
      router.push('/marketing-plan');
      return;
    }
    
    if (!router.isReady) return;
    
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Get parameters from URL
        const { strategyId, outlineId } = router.query;
        
        // Validate parameters
        if (!strategyId) {
          setError('Missing strategy ID. Please go back to the content outline page.');
          setLoading(false);
          return;
        }
        
        if (!outlineId) {
          setError('Missing outline ID. Please go back to the content outline page.');
          setLoading(false);
          return;
        }
        
        // Check for "null" string value which can happen with query parameters
        if (outlineId === "null") {
          setError('Invalid outline ID. Please go back to the marketing plan and try again.');
          setLoading(false);
          return;
        }

        // Fetch strategy details
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', strategyId)
          .single();
        
        if (strategyError) throw strategyError;
        
        if (!strategyData) {
          setError('Strategy not found.');
          setLoading(false);
          return;
        }
        
        setSelectedStrategy(strategyData);
        
        // Fetch content outline data using outlineId
        const { data: outlineData, error: outlineError } = await supabase
          .from('content_outlines')
          .select('*')
          .eq('id', outlineId)
          .single();
          
        if (outlineError) throw outlineError;
        
        if (!outlineData) {
          setError('Content outline not found.');
          setLoading(false);
          return;
        }
        
        // Set the content outline from the database
        setContentOutline(outlineData.outline || []);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to initialize: ' + err.message);
        setLoading(false);
      }
    };
    
    initialize();
  }, [router.isReady, router.query, user, authLoading]);
  
  // Handle post frequency selection
  const handleFrequencySelect = (frequency) => {
    setPostFrequency(frequency);
    
    // Update days based on frequency
    switch (frequency) {
      case 'light':
        setPostDays(['Monday', 'Thursday']);
        break;
      case 'moderate':
        setPostDays(['Monday', 'Wednesday', 'Friday']);
        break;
      case 'heavy':
        setPostDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        break;
      case 'intensive':
        setPostDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
        break;
      default:
        break;
    }
  };
  
  // Handle day selection
  const handleDayToggle = (day) => {
    if (postDays.includes(day)) {
      setPostDays(postDays.filter(d => d !== day));
    } else {
      setPostDays([...postDays, day]);
    }
  };
  
  // Handle channel toggling
  const handleChannelToggle = (channel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };
  
  // Generate the content calendar
  const handleGenerateCalendar = async () => {
    if (postDays.length === 0) {
      toast.error('Please select at least one day for posting');
      return;
    }
    
    if (selectedChannels.length === 0) {
      toast.error('Please select at least one social media channel');
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading('Creating calendar and generating posts...');
    
    let newCalendarId = null; // To store the ID of the created calendar

    try {
      // --- Step 1: Create the Calendar Record FIRST --- 
      console.log('Creating initial calendar record in Supabase...');
      const calendarName = `Content Calendar for ${selectedStrategy?.name || 'Strategy'}`;
      const { data: createdCalendarData, error: createCalendarError } = await supabase
        .from('calendars')
        .insert([
          {
            name: calendarName,
            user_id: user.id,
            strategy_id: selectedStrategy.id,
            // posts: [], // Initialize empty or omit if schema allows null
            progress: 0,
            posts_scheduled: 0, // Will be updated by the API
            posts_published: 0,
            status: 'generating', // Set initial status
            project_id: currentProject.id
          }
        ])
        .select('id') // Select only the ID
        .single(); // Expecting a single record

      if (createCalendarError) {
        console.error('Supabase calendar insert error:', createCalendarError);
        throw new Error(`Database error: ${createCalendarError.message || 'Failed to create calendar record'}`);
      }

      if (!createdCalendarData || !createdCalendarData.id) {
        console.error('No calendar ID returned from Supabase after insert');
        throw new Error('Database did not return an ID when creating the calendar');
      }

      newCalendarId = createdCalendarData.id;
      console.log('Calendar record created successfully with ID:', newCalendarId);
      toast.loading('Generating calendar posts... (Attempt 1/3)', { id: toastId });

      // --- Step 2: Call API to Generate and Save Posts --- 
      const calendarParams = {
        startDate,
        postFrequency,
        postDays,
        postTime,
        channels: selectedChannels
      };
      
      let attempts = 0;
      const maxAttempts = 3;
      let apiSuccess = false;
      let apiResponseData;
      
      while (attempts < maxAttempts && !apiSuccess) {
        try {
          attempts++;
          if (attempts > 1) {
            toast.loading(`Retrying post generation (Attempt ${attempts}/${maxAttempts})...`, { id: toastId });
          }
          
          console.log(`Calling generate-calendar API (Attempt ${attempts}) for calendar ID: ${newCalendarId}`);
          const response = await fetch('/api/calendar/generate-calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentOutline,
              strategy: selectedStrategy,
              calendarParams,
              calendarId: newCalendarId, // Pass the created calendar ID
              userId: user.id, // Pass the user ID
              modelConfig: {
                model: "gemini-2.0-flash",
                temperature: attempts > 1 ? 0.3 : 0.2,
                maxOutputTokens: 1000
              }
            }),
          });
          
          apiResponseData = await response.json(); // Always try to get JSON body

          if (!response.ok) {
            console.error(`Calendar API error (Attempt ${attempts}):`, apiResponseData);
            throw new Error(apiResponseData.error || `API error: ${response.status}`);
          }
          
          // API call succeeded
          apiSuccess = true; 
          console.log("generate-calendar API call successful:", apiResponseData);

        } catch (attemptError) {
          const errorDetails = attemptError.message || String(attemptError);
          console.error(`Calendar generation API attempt ${attempts} failed:`, attemptError);
                    
          if (attempts >= maxAttempts) {
             // If API fails finally, update calendar status to error or delete it?
             try {
               await supabase.from('calendars').update({ status: 'error' }).eq('id', newCalendarId);
             } catch (updateErr) { console.error("Failed to update calendar status to error", updateErr); }
             throw new Error(`Failed after ${maxAttempts} API attempts: ${errorDetails}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Wait longer on retries
        }
      }
      
      // --- Step 3: Navigate on Success --- 
      toast.dismiss(toastId);
      toast.success(apiResponseData?.message || 'Content calendar generated and posts saved!');
      
      // Navigate to the correct calendar view page using the created ID
      console.log(`Navigating to /calendar/${newCalendarId}`);
      router.push(`/calendar/${newCalendarId}`); 
      
    } catch (error) {
      console.error('Error in handleGenerateCalendar:', error);
      toast.dismiss(toastId);
      toast.error(`Failed to generate calendar: ${error.message || 'Unknown error'}`);
      setIsGenerating(false);
      // Optionally delete the created calendar record if API failed permanently
      if (newCalendarId) {
         console.log("Attempting to clean up failed calendar record:", newCalendarId);
         // supabase.from('calendars').delete().eq('id', newCalendarId); // Be careful with auto-delete
      }
    }
    // Do not set isGenerating to false here if navigation is successful
  };
  
  // Save the strategy ID to localStorage when it's loaded
  useEffect(() => {
    if (selectedStrategy?.id) {
      localStorage.setItem('lastStrategyId', selectedStrategy.id);
      
      // Also save the content outline if available
      if (contentOutline && contentOutline.length > 0) {
        try {
          localStorage.setItem('lastContentOutline', JSON.stringify(contentOutline));
        } catch (e) {
          console.error('Failed to save content outline to localStorage:', e);
        }
      }
    }
  }, [selectedStrategy, contentOutline]);
  
  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Loading Calendar Parameters | Mark1</title>
        </Head>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Error Loading Calendar | Mark1</title>
        </Head>
        <main className={styles.main}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
            <button 
              onClick={() => {
                const strategyId = selectedStrategy?.id || localStorage.getItem('lastStrategyId');
                if (strategyId) {
                  router.push(`/content/new?strategy=${strategyId}`);
                } else {
                  router.push('/marketing-plan');
                }
              }} 
              className={styles.returnButton}
            >
              Return to Content Outline
            </button>
          </div>
        </main>
      </div>
    );
  }
  
  // Count total posts
  const totalPosts = contentOutline.reduce((sum, week) => sum + (week.posts?.length || 0), 0);
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Configure Content Calendar | Mark1</title>
        <meta name="description" content="Set parameters for your content calendar" />
      </Head>

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Content Calendar Parameters</h1>
            <p>Configure your content calendar settings for optimal posting schedule.</p>
          </div>
        </div>
        
        <div className={styles.content}>
          <div className={styles.calendarParamsContainer}>
            {/* Content Summary */}
            <div className={styles.contentSummary}>
              <h2>Content Summary</h2>
              <div className={styles.summaryBox}>
                <p><strong>Strategy:</strong> {selectedStrategy?.name || 'Loading...'}</p>
                <p><strong>Total Weeks:</strong> {contentOutline?.length || 0}</p>
                <p><strong>Total Posts:</strong> {totalPosts}</p>
                <p><strong>Content Themes:</strong></p>
                <ul>
                  {contentOutline.map((week, index) => (
                    <li key={index}><strong>Week {week.week}:</strong> {week.theme}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Start Date */}
            <div className={styles.paramSection}>
              <h3>Start Date</h3>
              <p>When would you like to start posting your content?</p>
              <div className={styles.paramGroup}>
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            {/* Posting Frequency */}
            <div className={styles.paramSection}>
              <h3>Posting Frequency</h3>
              <p>How often would you like to post on social media?</p>
              <div className={styles.optionsGrid}>
                <button 
                  className={`${styles.optionButton} ${postFrequency === 'light' ? styles.optionSelected : ''}`}
                  onClick={() => handleFrequencySelect('light')}
                >
                  Light<br />(2/week)
                </button>
                <button 
                  className={`${styles.optionButton} ${postFrequency === 'moderate' ? styles.optionSelected : ''}`}
                  onClick={() => handleFrequencySelect('moderate')}
                >
                  Moderate<br />(3/week)
                </button>
                <button 
                  className={`${styles.optionButton} ${postFrequency === 'heavy' ? styles.optionSelected : ''}`}
                  onClick={() => handleFrequencySelect('heavy')}
                >
                  Heavy<br />(5/week)
                </button>
                <button 
                  className={`${styles.optionButton} ${postFrequency === 'intensive' ? styles.optionSelected : ''}`}
                  onClick={() => handleFrequencySelect('intensive')}
                >
                  Intensive<br />(7/week)
                </button>
              </div>
            </div>
            
            {/* Posting Days */}
            <div className={styles.paramSection}>
              <h3>Posting Days</h3>
              <p>On which days would you like to publish your content?</p>
              <div className={styles.bestPractices}>
                <h4>Best Practices for Fitness Content</h4>
                <p>For fitness audiences, the most engaging days are:</p>
                <ul>
                  <li><strong>Monday:</strong> When motivation is high for weekly fitness goals</li>
                  <li><strong>Wednesday:</strong> Mid-week motivation boost to counter slumps</li>
                  <li><strong>Friday:</strong> Perfect for weekend workout inspiration</li>
                  <li><strong>Sunday:</strong> Great for planning the upcoming week's fitness routine</li>
                </ul>
              </div>
              <div className={styles.daysGrid}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <button 
                    key={day}
                    className={`${styles.dayButton} ${postDays.includes(day) ? styles.daySelected : ''}`}
                    onClick={() => handleDayToggle(day)}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Posting Time */}
            <div className={styles.paramSection}>
              <h3>Posting Time</h3>
              <p>At what time would you like to schedule your posts?</p>
              <div className={styles.bestPractices}>
                <h4>Best Times for Fitness Content</h4>
                <p>Based on engagement analytics, the optimal times to post fitness content are:</p>
                <ul>
                  <li><strong>6:00-8:00 AM:</strong> Reach early-morning exercisers</li>
                  <li><strong>12:00-1:00 PM:</strong> Target lunch break browsers</li>
                  <li><strong>5:30-7:00 PM:</strong> Catch people after work planning evening workouts</li>
                  <li><strong>8:00-9:00 PM:</strong> Connect with those planning tomorrow's routine</li>
                </ul>
              </div>
              <div className={styles.paramGroup}>
                <label htmlFor="post-time">Time:</label>
                <input
                  type="time"
                  id="post-time"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                  className={styles.timeInput}
                />
              </div>
            </div>
            
            {/* Social Media Channels */}
            <div className={styles.paramSection}>
              <h3>Social Media Channels</h3>
              <p>Select the platforms where you want to publish your content:</p>
              <div className={styles.channelsGrid}>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('instagram') ? styles.channelSelected : ''}`}
                  onClick={() => handleChannelToggle('instagram')}
                >
                  <span className={styles.channelIcon}><Instagram /></span>
                  <span className={styles.channelName}>Instagram</span>
                </button>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('facebook') ? styles.channelSelected : ''} ${styles.channelDisabled}`}
                  onClick={() => handleChannelToggle('facebook')}
                  disabled={false} /* Not fully disabled to allow selection, but styled differently */
                >
                  <span className={styles.channelIcon}><Facebook /></span>
                  <span className={styles.channelName}>Facebook</span>
                </button>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('twitter') ? styles.channelSelected : ''} ${styles.channelDisabled}`}
                  onClick={() => handleChannelToggle('twitter')}
                  disabled={true}
                >
                  <span className={styles.channelIcon}><Twitter /></span>
                  <span className={styles.channelName}>Twitter</span>
                </button>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('linkedin') ? styles.channelSelected : ''} ${styles.channelDisabled}`}
                  onClick={() => handleChannelToggle('linkedin')}
                  disabled={true}
                >
                  <span className={styles.channelIcon}><Linkedin /></span>
                  <span className={styles.channelName}>LinkedIn</span>
                </button>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('youtube') ? styles.channelSelected : ''} ${styles.channelDisabled}`}
                  onClick={() => handleChannelToggle('youtube')}
                  disabled={true}
                >
                  <span className={styles.channelIcon}><Youtube /></span>
                  <span className={styles.channelName}>YouTube</span>
                </button>
                <button 
                  className={`${styles.channelButton} ${selectedChannels.includes('tiktok') ? styles.channelSelected : ''} ${styles.channelDisabled}`}
                  onClick={() => handleChannelToggle('tiktok')}
                  disabled={true}
                >
                  <span className={styles.channelIcon}><TikTok /></span>
                  <span className={styles.channelName}>TikTok</span>
                </button>
              </div>
              <div className={styles.channelNote}>
                <p><strong>Note:</strong> Currently only Instagram and Facebook are fully supported. Other platforms will be available in future updates.</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className={styles.actions}>
              <button 
                onClick={() => {
                  const strategyId = selectedStrategy?.id || localStorage.getItem('lastStrategyId');
                  if (strategyId) {
                    router.push(`/content/new?strategy=${strategyId}`);
                  } else {
                    router.push('/marketing-plan');
                  }
                }} 
                className={styles.backButton}
                disabled={isGenerating}
              >
                Back
              </button>
              <button 
                onClick={handleGenerateCalendar} 
                className={styles.generateButton}
                disabled={isGenerating || postDays.length === 0 || selectedChannels.length === 0}
              >
                {isGenerating ? 'Generating...' : 'Generate Content Calendar'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 