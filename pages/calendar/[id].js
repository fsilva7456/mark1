import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BreadcrumbNavigation from '../../components/BreadcrumbNavigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';
import { 
  ChartBarIcon, 
  CalendarIcon, 
  PencilIcon, 
  CheckCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  DocumentPlusIcon,
  ChartPieIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ContentCard from '../../components/ContentCard';
import MetricsSummary from '../../components/MetricsSummary';
import SuggestionsPanel from '../../components/SuggestionsPanel';

// Add these static generation methods to improve build-time handling
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export async function getStaticProps() {
  return {
    props: {}
  };
}

export default function ContentDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [calendar, setCalendar] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWeek, setActiveWeek] = useState(0); // Track the active week tab (0, 1, 2)
  const [generateLoading, setGenerateLoading] = useState(false);
  const [showRefreshBanner, setShowRefreshBanner] = useState(true);
  
  // Mock last updated date for strategy refresh banner
  const lastUpdatedWeeks = 10; // More than 9 weeks to show banner
  
  // States for metrics
  const [metrics, setMetrics] = useState({
    totalPosts: 0,
    published: 0,
    scheduled: 0,
    drafts: 0,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0
    },
    performanceScore: 0
  });
  
  // State for suggestions
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;
    
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // Fetch calendar details when ID is available
    if (id && user) {
      fetchCalendarDetails();
    }
  }, [id, user, loading, router]);
  
  const fetchCalendarDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (!id || !user) {
        console.error('Missing required parameters: calendar ID or user');
        toast.error('Missing required information');
        return;
      }
      
      console.log(`Fetching calendar details for ID: ${id}`);
      
      // Step 1: Fetch calendar details without trying to join strategy
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', id)
        .single();
        
      if (calendarError) {
        console.error('Error fetching calendar:', calendarError);
        toast.error('Failed to load calendar details');
        setError('Failed to load calendar details');
        setIsLoading(false);
        return;
      }
      
      if (!calendarData) {
        console.error('Calendar not found');
        toast.error('Calendar not found');
        router.push('/calendar/view');
        return;
      }
      
      console.log('Calendar data loaded:', calendarData);
      
      // Step 2: If calendar has a strategy_id, fetch the strategy separately
      let strategyData = null;
      if (calendarData.strategy_id) {
        const { data: strategy, error: strategyError } = await supabase
          .from('strategies')
          .select('id, name, target_audience, description')
          .eq('id', calendarData.strategy_id)
          .single();
          
        if (strategyError) {
          console.error('Error fetching strategy:', strategyError);
        } else {
          strategyData = strategy;
        }
      }
      
      // Combine calendar with strategy data
      const calendarWithStrategy = {
        ...calendarData,
        strategy: strategyData
      };
      
      setCalendar(calendarWithStrategy);
      
      // Step 3: Fetch posts for this calendar
      const { data: postsData, error: postsError } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('calendar_id', id)
        .order('scheduled_date', { ascending: true });
        
      if (postsError) {
        console.error('Error fetching posts:', postsError);
        toast.error('Failed to load calendar posts');
        setError('Failed to load calendar posts');
        setIsLoading(false);
        return;
      }
      
      console.log(`Loaded ${postsData?.length || 0} posts for calendar`);
      
      // Create default posts if none exist
      if (!postsData || postsData.length === 0) {
        console.log('No posts found, creating defaults');
        await createDefaultPosts(id, calendarWithStrategy);
      } else {
        setPosts(postsData);
        // Calculate metrics based on the posts
        calculateMetrics(postsData);
        // Generate content suggestions
        generateSuggestions(postsData, calendarWithStrategy);
      }
    } catch (error) {
      console.error('Error in fetchCalendarDetails:', error);
      toast.error('Failed to load calendar data');
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate metrics from posts data
  const calculateMetrics = (postsData) => {
    const published = postsData.filter(post => post.status === 'published').length;
    const scheduled = postsData.filter(post => post.status === 'scheduled').length;
    const drafts = postsData.filter(post => post.status === 'draft').length;
    
    // Calculate total engagement
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    
    postsData.forEach(post => {
      if (post.engagement) {
        totalLikes += post.engagement.likes || 0;
        totalComments += post.engagement.comments || 0;
        totalShares += post.engagement.shares || 0;
      }
    });
    
    // Calculate performance score (example algorithm)
    const publishedPosts = postsData.filter(post => post.status === 'published');
    let performanceScore = 0;
    
    if (publishedPosts.length > 0) {
      const engagementRate = (totalLikes + totalComments * 2 + totalShares * 3) / publishedPosts.length;
      performanceScore = Math.min(Math.round(engagementRate / 10 * 100), 100);
    }
    
    setMetrics({
      totalPosts: postsData.length,
      published,
      scheduled,
      drafts,
      engagement: {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares
      },
      performanceScore
    });
  };
  
  // Generate suggestions based on data
  const generateSuggestions = (postsData, calendarData) => {
    const suggestions = [];
    
    // Check if there are upcoming posts that need content
    const upcomingPosts = postsData.filter(post => 
      post.status === 'scheduled' && 
      new Date(post.scheduled_date) > new Date() &&
      (!post.content || post.content.trim() === '')
    );
    
    if (upcomingPosts.length > 0) {
      suggestions.push({
        type: 'action',
        title: 'Complete upcoming content',
        description: `You have ${upcomingPosts.length} scheduled posts that need content.`,
        action: 'Create content',
        priority: 'high',
        icon: 'pencil'
      });
    }
    
    // Check post frequency and consistency
    const publishedPosts = postsData.filter(post => post.status === 'published');
    if (publishedPosts.length > 0) {
      const lastPostDate = new Date(Math.max(...publishedPosts.map(p => new Date(p.published_date || p.scheduled_date))));
      const daysSinceLastPost = Math.floor((new Date() - lastPostDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastPost > 7) {
        suggestions.push({
          type: 'alert',
          title: 'Posting frequency low',
          description: `It's been ${daysSinceLastPost} days since your last post. Consider increasing your posting frequency.`,
          action: 'Schedule posts',
          priority: 'medium',
          icon: 'calendar'
        });
      }
    }
    
    // Check engagement metrics and suggest strategy updates if low
    const publishedPostsCount = publishedPosts.length;
    if (publishedPostsCount >= 5) {
      const avgEngagement = publishedPosts.reduce((sum, post) => {
        if (!post.engagement) return sum;
        return sum + (post.engagement.likes || 0) + (post.engagement.comments || 0) * 2;
      }, 0) / publishedPostsCount;
      
      if (avgEngagement < 10) {
        suggestions.push({
          type: 'suggestion',
          title: 'Update content strategy',
          description: 'Your engagement metrics are below average. Consider updating your content strategy.',
          action: 'Update strategy',
          priority: 'medium',
          icon: 'refresh'
        });
      }
    }
    
    // Always suggest creating new content if less than 5 upcoming posts
    const upcomingPostsCount = postsData.filter(post => 
      post.status === 'scheduled' && 
      new Date(post.scheduled_date) > new Date()
    ).length;
    
    if (upcomingPostsCount < 5) {
      suggestions.push({
        type: 'suggestion',
        title: 'Generate more content',
        description: `You have only ${upcomingPostsCount} upcoming posts scheduled. Generate more content to maintain consistency.`,
        action: 'Create outline',
        priority: upcomingPostsCount === 0 ? 'high' : 'low',
        icon: 'document'
      });
    }
    
    // Check analytics for insights
    if (publishedPostsCount >= 10) {
      suggestions.push({
        type: 'insight',
        title: 'Review analytics',
        description: 'You have enough published posts to gain meaningful insights from your analytics.',
        action: 'View analytics',
        priority: 'low',
        icon: 'chart'
      });
    }
    
    setSuggestions(suggestions);
  };

  // Organize posts by week
  const getPostsByWeek = () => {
    if (!posts.length) return [[], [], []];
    
    // Sort posts by scheduled date
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(a.scheduled_date) - new Date(b.scheduled_date)
    );
    
    // Get the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Create dates for 3 weeks
    const week1Start = startOfWeek;
    const week1End = new Date(week1Start);
    week1End.setDate(week1Start.getDate() + 6);
    
    const week2Start = new Date(week1End);
    week2Start.setDate(week2Start.getDate() + 1);
    const week2End = new Date(week2Start);
    week2End.setDate(week2Start.getDate() + 6);
    
    const week3Start = new Date(week2End);
    week3Start.setDate(week3Start.getDate() + 1);
    const week3End = new Date(week3Start);
    week3End.setDate(week3Start.getDate() + 6);
    
    // Filter posts by week
    const week1Posts = sortedPosts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate >= week1Start && postDate <= week1End;
    });
    
    const week2Posts = sortedPosts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate >= week2Start && postDate <= week2End;
    });
    
    const week3Posts = sortedPosts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate >= week3Start && postDate <= week3End;
    });
    
    return [week1Posts, week2Posts, week3Posts];
  };

  // Generate a new week of content
  const handleGenerateNewWeek = async () => {
    setGenerateLoading(true);
    
    // Mock API call - would be replaced with actual generation logic
    setTimeout(() => {
      // Create some mock posts for the new week
      const now = new Date();
      const startOfNextWeek = new Date(now);
      startOfNextWeek.setDate(now.getDate() + 7 + (1 - now.getDay())); // Next Monday
      
      const newPosts = [
        {
          id: `generated-${Date.now()}-1`,
          title: 'Generated Post 1',
          content: 'AI generated content for your social media.',
          channel: 'Instagram',
          post_type: 'Image',
          scheduled_date: new Date(startOfNextWeek).toISOString(),
          status: 'draft',
          calendar_id: id,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0 }
        },
        {
          id: `generated-${Date.now()}-2`,
          title: 'Generated Post 2',
          content: 'More AI generated content customized for your audience.',
          channel: 'Facebook',
          post_type: 'Video',
          scheduled_date: new Date(startOfNextWeek.setDate(startOfNextWeek.getDate() + 2)).toISOString(),
          status: 'draft',
          calendar_id: id,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0 }
        },
        {
          id: `generated-${Date.now()}-3`,
          title: 'Generated Post 3',
          content: 'Strategic content aligned with your marketing goals.',
          channel: 'LinkedIn',
          post_type: 'Article',
          scheduled_date: new Date(startOfNextWeek.setDate(startOfNextWeek.getDate() + 2)).toISOString(),
          status: 'draft',
          calendar_id: id,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0 }
        }
      ];
      
      // Add new posts to state
      setPosts(prevPosts => [...prevPosts, ...newPosts]);
      setGenerateLoading(false);
      toast.success('New week of content generated!');
      
      // Switch to the week containing the new content
      setActiveWeek(2);
    }, 2000);
  };

  // Handle suggestion action
  const handleSuggestionAction = (suggestion) => {
    console.log('Action triggered for suggestion:', suggestion);
    
    // Handle different suggestion actions
    switch (suggestion.actionLabel) {
      case 'Add Video Post':
        router.push(`/post-editor/new?calendarId=${id}&type=video`);
        break;
      case 'Schedule Post':
        router.push(`/post-editor/new?calendarId=${id}`);
        break;
      case 'View Details':
        toast.info('Viewing suggestion details (placeholder)');
        break;
      default:
        console.log('Unknown action:', suggestion.actionLabel);
    }
  };

  // Create week tabs with day labels
  const getWeekDates = (weekIndex) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Adjust for the week index
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  // Format date to readable string
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Post placeholder for empty days
  const EmptyDayPlaceholder = ({ date }) => (
    <div className={styles.emptyDay}>
      <p className={styles.emptyDayDate}>{formatDate(date)}</p>
      <p className={styles.emptyDayText}>No posts scheduled</p>
      <Link 
        href={`/post-editor/new?calendarId=${id}&date=${date.toISOString().split('T')[0]}`} 
        className={styles.addPostLink}
      >
        + Add Post
      </Link>
    </div>
  );

  return (
    <div className={styles.dashboardContainer}>
      <Head>
        <title>Content Management | Mark1</title>
        <meta name="description" content="Manage your content calendar and track performance" />
      </Head>
      
      <main className={styles.dashboardMain}>
        <BreadcrumbNavigation 
          path={[
            { name: 'Dashboard', href: '/' },
            { name: 'Marketing Plan', href: '/marketing-plan' },
            { name: 'Content Management', href: `/calendar/${id}` }
          ]}
        />
      
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading your content dashboard...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={() => router.reload()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className={styles.dashboardHeader}>
              <div>
                <h1 className={styles.dashboardTitle}>Content Management</h1>
                <p className={styles.dashboardSubtitle}>{calendar?.name || 'Your content calendar'}</p>
              </div>
              
              <div className={styles.dashboardActions}>
                <Link href={`/post-editor/new?calendarId=${id}`} className={styles.primaryButton}>
                  + New Post
                </Link>
              </div>
            </div>
            
            {/* Strategy Refresh Banner - shown if lastUpdatedWeeks > 9 */}
            {showRefreshBanner && lastUpdatedWeeks > 9 && (
              <div className={styles.strategyRefreshBanner}>
                <div className={styles.bannerContent}>
                  <ArrowPathIcon className={styles.bannerIcon} />
                  <p>It's been {lastUpdatedWeeks} weeks since you updated your strategy. Time for a refresh?</p>
                  <Link href={`/strategy/refresh?strategyId=${calendar?.strategy_id}`} className={styles.bannerButton}>
                    Review Strategy
                  </Link>
                </div>
                <button 
                  className={styles.closeBannerButton}
                  onClick={() => setShowRefreshBanner(false)}
                >
                  <XMarkIcon className={styles.closeIcon} />
                </button>
              </div>
            )}
            
            {/* Main Dashboard Grid */}
            <div className={styles.newDashboardGrid}>
              {/* Left column: Calendar view */}
              <section className={styles.calendarSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    3-Week Content Calendar
                  </h2>
                  
                  <div className={styles.weekTabs}>
                    <button 
                      className={`${styles.weekTab} ${activeWeek === 0 ? styles.activeWeekTab : ''}`}
                      onClick={() => setActiveWeek(0)}
                    >
                      This Week
                    </button>
                    <button 
                      className={`${styles.weekTab} ${activeWeek === 1 ? styles.activeWeekTab : ''}`}
                      onClick={() => setActiveWeek(1)}
                    >
                      Next Week
                    </button>
                    <button 
                      className={`${styles.weekTab} ${activeWeek === 2 ? styles.activeWeekTab : ''}`}
                      onClick={() => setActiveWeek(2)}
                    >
                      Week After
                    </button>
                  </div>
                </div>
                
                <div className={styles.weekCalendarView}>
                  {/* Day headers */}
                  <div className={styles.calendarDayHeaders}>
                    {getWeekDates(activeWeek).map((date, index) => (
                      <div key={index} className={styles.dayHeader}>
                        {formatDate(date)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Posts for each day */}
                  <div className={styles.calendarDays}>
                    {getWeekDates(activeWeek).map((date, dayIndex) => {
                      const dayPosts = getPostsByWeek()[activeWeek].filter(post => {
                        const postDate = new Date(post.scheduled_date);
                        return postDate.getDate() === date.getDate() && 
                               postDate.getMonth() === date.getMonth() && 
                               postDate.getFullYear() === date.getFullYear();
                      });
                      
                      return (
                        <div key={dayIndex} className={styles.calendarDay}>
                          {dayPosts.length > 0 ? (
                            dayPosts.map(post => (
                              <ContentCard key={post.id} post={post} calendarId={id} />
                            ))
                          ) : (
                            <EmptyDayPlaceholder date={date} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className={styles.generateButtonContainer}>
                  <button 
                    className={styles.generateButton}
                    onClick={handleGenerateNewWeek}
                    disabled={generateLoading}
                  >
                    {generateLoading ? (
                      <>
                        <div className={styles.smallSpinner}></div>
                        Generating...
                      </>
                    ) : (
                      <>Generate Next Week</>
                    )}
                  </button>
                </div>
              </section>
              
              {/* Right column: Metrics and Suggestions */}
              <section className={styles.metricsAndSuggestionsSection}>
                {/* Engagement Summary */}
                <MetricsSummary calendarId={id} />
                
                {/* AI Suggestions Panel */}
                <SuggestionsPanel calendarId={id} />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 