import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Calendar.module.css';
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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        
        // Parse content outline from query params
        const { contentOutline: contentOutlineParam, strategyId } = router.query;
        
        // First try using URL parameters
        if (contentOutlineParam && strategyId) {
          try {
            // Parse the content outline from JSON
            const parsedContentOutline = JSON.parse(contentOutlineParam);
            setContentOutline(parsedContentOutline);
            
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
            setLoading(false);
            return;
          } catch (parseError) {
            console.error('Error parsing content outline:', parseError);
            // Continue to fallback if parsing fails
          }
        }
        
        // Try to load from localStorage as fallback
        const savedStrategyId = localStorage.getItem('lastStrategyId');
        const savedContentOutline = localStorage.getItem('lastContentOutline');
        
        if (savedStrategyId && savedContentOutline) {
          try {
            // Parse the saved content outline
            const parsedContentOutline = JSON.parse(savedContentOutline);
            setContentOutline(parsedContentOutline);
            
            // Fetch strategy details
            const { data: strategyData, error: strategyError } = await supabase
              .from('strategies')
              .select('*')
              .eq('id', savedStrategyId)
              .single();
            
            if (strategyError) throw strategyError;
            
            if (!strategyData) {
              setError('Strategy not found.');
              setLoading(false);
              return;
            }
            
            setSelectedStrategy(strategyData);
            setLoading(false);
            return;
          } catch (fallbackError) {
            console.error('Error loading from localStorage:', fallbackError);
          }
        }
        
        // If we get here, both methods failed
        setError('Missing required parameters. Please go back to the content outline page.');
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to initialize: ' + err.message);
      } finally {
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
    const toastId = toast.loading('Generating your content calendar...');
    
    try {
      // Prepare calendar parameters
      const calendarParams = {
        startDate,
        postFrequency,
        postDays,
        postTime,
        channels: selectedChannels
      };
      
      // Try up to 3 times to generate the calendar
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      let calendarData;
      let errorMessage;
      
      while (attempts < maxAttempts && !success) {
        try {
          attempts++;
          if (attempts > 1) {
            toast.loading(`Retrying calendar generation (Attempt ${attempts}/${maxAttempts})...`, { id: toastId });
          }
          
          // Call the API to generate the content calendar
          const response = await fetch('/api/content/generate-calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentOutline,
              strategy: selectedStrategy,
              calendarParams,
              modelConfig: {
                model: "gemini-2.0-flash",  // Use Gemini 2.0 Flash
                temperature: attempts > 1 ? 0.3 : 0.2, // Slightly increase temperature on retries
                maxOutputTokens: 1000
              }
            }),
          });
          
          // Handle non-200 responses
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Calendar API error:', errorData);
            errorMessage = errorData.error || `API error: ${response.status}`;
            
            // Throw to trigger retry
            throw new Error(errorMessage);
          }
          
          const data = await response.json();
          
          // Validate response format
          if (!data || !data.posts || !Array.isArray(data.posts)) {
            errorMessage = 'Invalid response format from calendar API';
            throw new Error(errorMessage);
          }
          
          // Save the calendar data to Supabase
          console.log('Attempting to save calendar to Supabase with posts:', data.posts.length);
          try {
            const { data: savedCalendar, error: calendarError } = await supabase
              .from('calendars')
              .insert([
                {
                  name: `Content Calendar for ${selectedStrategy?.name || 'Strategy'}`,
                  user_id: user.id,
                  strategy_id: selectedStrategy.id,
                  posts: data.posts,
                  progress: 0,
                  posts_scheduled: data.posts.length,
                  posts_published: 0,
                  status: 'active',
                  project_id: currentProject.id
                }
              ])
              .select();
            
            if (calendarError) {
              console.error('Supabase calendar insert error:', calendarError);
              throw new Error(`Database error: ${calendarError.message || 'Failed to save calendar'}`);
            }
            
            if (!savedCalendar || savedCalendar.length === 0) {
              console.error('No calendar data returned from Supabase');
              throw new Error('Database returned empty response when saving calendar');
            }
            
            console.log('Calendar saved successfully with ID:', savedCalendar[0].id);
            calendarData = savedCalendar;
            success = true;
          } catch (dbError) {
            console.error('Database operation failed:', dbError);
            throw dbError;
          }
          
        } catch (attemptError) {
          const errorDetails = attemptError.message || String(attemptError);
          console.error(`Calendar generation attempt ${attempts} failed:`, attemptError);
          console.error(`Error details:`, errorDetails);
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed after ${maxAttempts} attempts: ${errorDetails}`);
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      toast.dismiss(toastId);
      toast.success('Content calendar generated successfully!');
      
      // Navigate to the calendar view page
      router.push(`/content/calendar-view?id=${calendarData[0].id}`);
      
    } catch (error) {
      console.error('Error generating calendar:', error);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      toast.dismiss(toastId);
      
      // Provide more specific error messages based on error type
      if (error.message && error.message.includes('parse') || (error.message && error.message.includes('JSON'))) {
        toast.error('Error: The API response format was invalid. Please try again.');
      } else if (error.message && error.message.includes('API')) {
        toast.error('Error: Failed to connect to the calendar generation service. Please try again later.');
      } else if (error.message && error.message.includes('Database') || error.message && error.message.includes('404')) {
        toast.error('Database error: Could not save calendar. Please try again or contact support.');
      } else {
        toast.error(`Failed to generate calendar: ${error.message || 'Unknown error'}`);
      }
      
      setIsGenerating(false);
    }
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
          <title>Calendar Parameters | Mark1</title>
        </Head>
        <Navbar />
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
          <title>Error | Mark1</title>
        </Head>
        <Navbar />
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
        <title>Calendar Parameters | Mark1</title>
      </Head>
      
      <Navbar />
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