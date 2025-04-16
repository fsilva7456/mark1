import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BreadcrumbNavigation from '@components/shared/BreadcrumbNavigation';
import { supabase } from '@lib/supabase';
import logger from '@lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import styles from '@/styles/Calendar.module.css';
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
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ContentCard from '@modules/content-mgmt/components/ContentCard';
import MetricsSummary from '@modules/content-mgmt/components/MetricsSummary';
import SuggestionsPanel from '@modules/content-mgmt/components/SuggestionsPanel';

// Create a logger instance for this component
const log = logger.createLogger('ContentDashboard');

// Add these static generation methods to improve build-time handling
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  };
}

export async function getStaticProps() {
  return {
    props: {},
  };
}

// Helper function to check if a date is within the last 7 days
const isWithinLast7Days = dateString => {
  const date = new Date(dateString);
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  return date >= sevenDaysAgo && date <= now;
};

// Helper function to sum an array of numbers
const sum = numbers => numbers.reduce((total, num) => total + num, 0);

// Helper function to get the week number of a date relative to current week
const getWeekNumber = date => {
  try {
    // Temporary fix: return week 0 for all posts to ensure they display
    // This will make all posts appear in the current week view
    return 0;
    
    /* Original calculation - commented out for now
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    const inputDate = new Date(date);
    
    // Debug date calculations
    log.debug('Week number calculation', {
      dateString: date,
      parsedDate: inputDate.toISOString(),
      today: now.toISOString(),
      currentWeekStart: currentWeekStart.toISOString(),
      dayOfWeek: dayOfWeek,
      dateDiff: diff
    });
    
    if (isNaN(inputDate.getTime())) {
      log.error('Invalid date in getWeekNumber', { dateString: date });
      return -100; // Return a very negative number to make the issue obvious
    }

    const diffTime = inputDate.getTime() - currentWeekStart.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const weekNumber = Math.floor(diffDays / 7);
    
    log.debug('Week calculation result', {
      diffTimeMs: diffTime,
      diffDays: diffDays,
      weekNumber: weekNumber
    });
    
    return weekNumber;
    */
  } catch (error) {
    log.error('Error in getWeekNumber', { 
      error: error.message, 
      dateString: date 
    });
    return 0; // Force display in current week if there's an error
  }
};

export default function ContentDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [calendar, setCalendar] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groupedPosts, setGroupedPosts] = useState([[], [], []]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWeek, setActiveWeek] = useState(0); // Track the active week tab (0, 1, 2)
  const [generateLoading, setGenerateLoading] = useState(false);
  const [showRefreshBanner, setShowRefreshBanner] = useState(true);
  const [strategy, setStrategy] = useState(null);
  const [lastUpdatedWeeks, setLastUpdatedWeeks] = useState(0);

  // States for metrics
  const [metrics, setMetrics] = useState({
    totalPosts: 0,
    published: 0,
    scheduled: 0,
    drafts: 0,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
    },
    engagementRate: 0,
    performanceScore: 0,
  });

  // State for suggestions
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    // Skip during server-side rendering
    if (typeof window === 'undefined') return;

    // Redirect if not logged in
    if (!loading && !user) {
      log.warn('User not authenticated, redirecting to home page');
      router.push('/');
      return;
    }

    // Fetch calendar details when ID is available
    if (id && user) {
      log.info(`Initializing dashboard for calendar ID: ${id}`);
      fetchCalendarDetails();
    }
  }, [id, user, loading, router]);

  // Group posts by week (current, next, week after)
  const groupPostsByWeek = useCallback(postsData => {
    // Create an array to hold three weeks of posts
    const weeks = [[], [], []];

    if (!postsData || postsData.length === 0) {
      log.warn('No posts data provided to groupPostsByWeek');
      return weeks;
    }

    log.debug('Grouping posts by week', { 
      totalPostsCount: postsData.length,
      postsBeforeFiltering: postsData.map(p => ({
        id: p.id, 
        status: p.status,
        date: p.scheduled_date
      }))
    });

    // Filter to include only scheduled and published posts
    const relevantPosts = postsData.filter(
      post => post.status === 'scheduled' || post.status === 'published'
    );

    log.debug('Filtered posts for grouping', { 
      filteredPostsCount: relevantPosts.length,
      postsAfterFiltering: relevantPosts.map(p => ({
        id: p.id, 
        status: p.status,
        date: p.scheduled_date
      }))
    });

    // Sort posts by scheduled_date
    const sortedPosts = [...relevantPosts].sort(
      (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)
    );

    // Group posts by week relative to current date
    sortedPosts.forEach(post => {
      const weekNumber = getWeekNumber(post.scheduled_date);
      
      // Debug each post's week calculation
      log.debug(`Post week calculation for ID ${post.id}`, {
        postId: post.id,
        postDate: post.scheduled_date,
        calculatedWeekNumber: weekNumber,
        willBeIncluded: weekNumber >= 0 && weekNumber <= 2
      });

      // Only include posts for current week (0), next week (1), and week after (2)
      if (weekNumber >= 0 && weekNumber <= 2) {
        weeks[weekNumber].push(post);
      }
    });

    log.debug('Final grouped posts result', {
      week0Count: weeks[0].length,
      week1Count: weeks[1].length,
      week2Count: weeks[2].length
    });

    return weeks;
  }, []);

  // Create default posts when a new calendar is created
  const createDefaultPosts = async (calendarId, calendarData) => {
    try {
      console.log('Creating default posts for calendar:', calendarId);

      // Get the start of the current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      // Create sample posts for the current week
      const defaultPosts = [
        {
          title: 'Welcome Post',
          content: 'Introducing our new content series. Stay tuned for more!',
          channel: 'Instagram',
          post_type: 'Image',
          scheduled_date: new Date(startOfWeek).toISOString(),
          status: 'draft',
          calendar_id: calendarId,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
        },
        {
          title: 'Product Feature',
          content: 'Check out these amazing features of our product.',
          channel: 'Facebook',
          post_type: 'Article',
          scheduled_date: new Date(startOfWeek.setDate(startOfWeek.getDate() + 2)).toISOString(),
          status: 'draft',
          calendar_id: calendarId,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
        },
        {
          title: 'Customer Story',
          content: 'How our solutions helped this customer achieve their goals.',
          channel: 'LinkedIn',
          post_type: 'Video',
          scheduled_date: new Date(startOfWeek.setDate(startOfWeek.getDate() + 2)).toISOString(),
          status: 'draft',
          calendar_id: calendarId,
          user_id: user.id,
          engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
        },
      ];

      // Insert posts into database
      const { data, error } = await supabase.from('calendar_posts').insert(defaultPosts).select();

      if (error) {
        console.error('Error creating default posts:', error);
        toast.error('Failed to create default posts');
        return;
      }

      console.log('Created default posts:', data);
      setPosts(data);

      // Group posts by week
      const grouped = groupPostsByWeek(data);
      setGroupedPosts(grouped);

      toast.success('Default posts created for your calendar');

      // Calculate metrics and generate suggestions
      calculateMetrics(data);
      generateSuggestions(data, calendarData, strategy);
    } catch (error) {
      console.error('Error in createDefaultPosts:', error);
      toast.error('Failed to create default posts');
    }
  };

  const fetchCalendarDetails = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!id || !user) {
        log.error('Missing required parameters', { id, userId: user?.id });
        toast.error('Missing required information');
        setIsLoading(false);
        return;
      }

      log.info(`Fetching calendar details for ID: ${id}`);

      // Step 1: Fetch calendar details without trying to join strategy
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', id)
        .single();

      if (calendarError) {
        log.error('Error fetching calendar', { 
          error: calendarError,
          id,
          status: calendarError.status,
          message: calendarError.message,
          details: calendarError.details
        });
        toast.error('Failed to load calendar details');
        setError('Failed to load calendar details');
        setIsLoading(false);
        return;
      }

      if (!calendarData) {
        log.error('Calendar not found', { id });
        toast.error('Calendar not found');
        router.push('/calendar/view');
        return;
      }

      log.info('Calendar data loaded', { 
        id: calendarData.id,
        name: calendarData.name,
        strategyId: calendarData.strategy_id
      });

      // Step 2: If calendar has a strategy_id, fetch the strategy separately
      let strategyData = null;
      if (calendarData.strategy_id) {
        log.info(`Fetching related strategy: ${calendarData.strategy_id}`);
        const { data: strategy, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', calendarData.strategy_id)
          .single();

        if (strategyError) {
          console.error('Error fetching strategy:', strategyError);
        } else {
          strategyData = strategy;
          setStrategy(strategy);

          // Calculate how many weeks since strategy was updated
          if (strategy.updated_at) {
            const updatedDate = new Date(strategy.updated_at);
            const now = new Date();
            const diffTime = Math.abs(now - updatedDate);
            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            setLastUpdatedWeeks(diffWeeks);
          }
        }
      }

      // Combine calendar with strategy data
      const calendarWithStrategy = {
        ...calendarData,
        strategy: strategyData,
      };

      setCalendar(calendarWithStrategy);

      // Step 3: Fetch posts for this calendar - filter for scheduled and published posts
      log.info(`Fetching posts for calendar: ${id}`);
      const { data: postsData, error: postsError } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('calendar_id', id)
        .order('scheduled_date', { ascending: true });

      if (postsError) {
        log.error('Error fetching posts', { 
          error: postsError,
          calendarId: id,
          status: postsError.status,
          message: postsError.message,
          details: postsError.details
        });
        toast.error('Failed to load calendar posts');
        setError('Failed to load calendar posts');
        setIsLoading(false);
        return;
      }

      log.info(`Loaded ${postsData?.length || 0} posts for calendar`, {
        calendarId: id, 
        firstPostId: postsData?.[0]?.id,
        postCount: postsData?.length || 0,
        postIds: postsData?.map(p => p.id)
      });

      // Create default posts if none exist
      if (!postsData || postsData.length === 0) {
        log.warn('No posts found, creating defaults', { calendarId: id });
        await createDefaultPosts(id, calendarWithStrategy);
      } else {
        setPosts(postsData);

        // Group posts by week
        const grouped = groupPostsByWeek(postsData);
        log.debug('Posts grouped by week', { 
          week0Count: grouped[0].length, 
          week1Count: grouped[1].length, 
          week2Count: grouped[2].length 
        });
        setGroupedPosts(grouped);

        // Calculate metrics based on the posts
        calculateMetrics(postsData);
        // Generate content suggestions
        generateSuggestions(postsData, calendarWithStrategy, strategyData);
      }
    } catch (error) {
      log.error('Error in fetchCalendarDetails', { 
        error: error.message,
        stack: error.stack,
        calendarId: id
      });
      toast.error('Failed to load calendar data');
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics from posts data - now considering the past 7 days
  const calculateMetrics = useCallback(postsData => {
    const published = postsData.filter(post => post.status === 'published').length;
    const scheduled = postsData.filter(post => post.status === 'scheduled').length;
    const drafts = postsData.filter(post => post.status === 'draft').length;

    // Get posts from last 7 days
    const recentPosts = postsData.filter(
      post => isWithinLast7Days(post.scheduled_date) && post.status === 'published'
    );

    // Calculate total engagement
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalReach = 0;

    recentPosts.forEach(post => {
      if (post.engagement) {
        totalLikes += post.engagement.likes || 0;
        totalComments += post.engagement.comments || 0;
        totalShares += post.engagement.shares || 0;
        totalReach += post.engagement.reach || 0;
      }
    });

    // Calculate engagement rate and performance score
    let engagementRate = 0;
    let performanceScore = 0;

    if (totalReach > 0) {
      engagementRate = ((totalLikes + totalComments + totalShares) / totalReach) * 100;
      engagementRate = Math.round(engagementRate * 100) / 100; // Round to 2 decimal places
    }

    if (recentPosts.length > 0) {
      const engagementPerPost =
        (totalLikes + totalComments * 2 + totalShares * 3) / recentPosts.length;
      performanceScore = Math.min(Math.round((engagementPerPost / 10) * 100), 100);
    }

    setMetrics({
      totalPosts: postsData.length,
      published,
      scheduled,
      drafts,
      engagement: {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        reach: totalReach,
      },
      engagementRate,
      performanceScore,
    });
  }, []);

  // Enhanced suggestion generation based on real data
  const generateSuggestions = useCallback(
    (postsData, calendarData, strategyData) => {
      const suggestions = [];

      // Check if there are upcoming posts that need content
      const upcomingPosts = postsData.filter(
        post =>
          post.status === 'scheduled' &&
          new Date(post.scheduled_date) > new Date() &&
          (!post.content || post.content.trim() === '')
      );

      if (upcomingPosts.length > 0) {
        suggestions.push({
          id: 'missing-content',
          title: 'Complete upcoming content',
          description: `You have ${upcomingPosts.length} scheduled posts that need content.`,
          priority: 'high',
          iconType: 'document',
          actionLabel: 'Create content',
          actionRoute: `/post-editor/${upcomingPosts[0].id}`,
        });
      }

      // Check for channel diversity
      const postsByChannel = {};
      postsData.forEach(post => {
        if (post.channel) {
          postsByChannel[post.channel] = (postsByChannel[post.channel] || 0) + 1;
        }
      });

      // Check if Instagram usage is low
      const instagramCount = postsByChannel['Instagram'] || 0;
      const totalChannelPosts = Object.values(postsByChannel).reduce(
        (sum, count) => sum + count,
        0
      );

      if (totalChannelPosts > 5 && instagramCount / totalChannelPosts < 0.2) {
        suggestions.push({
          id: 'low-instagram',
          title: 'Increase Instagram presence',
          description:
            'Your Instagram usage is lower than recommended. Consider adding more Instagram posts.',
          priority: 'medium',
          iconType: 'calendar',
          actionLabel: 'Add Instagram post',
          actionRoute: `/post-editor/new?calendarId=${id}&channel=Instagram`,
        });
      }

      // Analyze post types and engagement
      const postsByType = {};
      const engagementByType = {};

      postsData.forEach(post => {
        if (post.post_type) {
          postsByType[post.post_type] = (postsByType[post.post_type] || 0) + 1;

          if (post.status === 'published' && post.engagement) {
            if (!engagementByType[post.post_type]) {
              engagementByType[post.post_type] = {
                count: 0,
                likes: 0,
                comments: 0,
                shares: 0,
              };
            }

            engagementByType[post.post_type].count++;
            engagementByType[post.post_type].likes += post.engagement.likes || 0;
            engagementByType[post.post_type].comments += post.engagement.comments || 0;
            engagementByType[post.post_type].shares += post.engagement.shares || 0;
          }
        }
      });

      // Find post type with highest engagement
      let highestEngagementType = null;
      let highestEngagementScore = 0;

      Object.entries(engagementByType).forEach(([type, data]) => {
        if (data.count > 0) {
          const score = (data.likes + data.comments * 2 + data.shares * 3) / data.count;
          if (score > highestEngagementScore) {
            highestEngagementScore = score;
            highestEngagementType = type;
          }
        }
      });

      if (highestEngagementType && highestEngagementScore > 10) {
        suggestions.push({
          id: 'best-performing-type',
          title: `Create more ${highestEngagementType} content`,
          description: `${highestEngagementType} posts are performing well. Consider adding more of this type.`,
          priority: 'medium',
          iconType: 'chart',
          actionLabel: `Add ${highestEngagementType} post`,
          actionRoute: `/post-editor/new?calendarId=${id}&type=${highestEngagementType}`,
        });
      }

      // Check post frequency and consistency
      const publishedPosts = postsData.filter(post => post.status === 'published');
      if (publishedPosts.length > 0) {
        const lastPostDate = new Date(
          Math.max(...publishedPosts.map(p => new Date(p.published_date || p.scheduled_date)))
        );
        const daysSinceLastPost = Math.floor((new Date() - lastPostDate) / (1000 * 60 * 60 * 24));

        if (daysSinceLastPost > 7) {
          suggestions.push({
            id: 'posting-frequency',
            title: 'Posting frequency low',
            description: `It's been ${daysSinceLastPost} days since your last post. Consider increasing your posting frequency.`,
            priority: 'high',
            iconType: 'calendar',
            actionLabel: 'Schedule posts',
            actionRoute: `/post-editor/new?calendarId=${id}`,
          });
        }
      }

      // Suggest strategy refresh if it's been more than 9 weeks since the last update
      if (strategyData && lastUpdatedWeeks > 9) {
        suggestions.push({
          id: 'strategy-refresh',
          title: 'Update your strategy',
          description: `It's been ${lastUpdatedWeeks} weeks since you updated your strategy. Time for a refresh?`,
          priority: 'medium',
          iconType: 'refresh',
          actionLabel: 'Review Strategy',
          actionRoute: `/strategy/refresh?strategyId=${strategyData.id}`,
        });
      }

      // Limit to 3 suggestions, prioritizing by priority (high, medium, low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sortedSuggestions = suggestions
        .sort((a, b) => {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .slice(0, 3);

      setSuggestions(sortedSuggestions);
    },
    [id, lastUpdatedWeeks]
  );

  // Generate a new week of content
  const handleGenerateNewWeek = async () => {
    setGenerateLoading(true);

    try {
      // Get the start date for the week after next (week 2)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setDate(diff);
      startOfCurrentWeek.setHours(0, 0, 0, 0);

      const startOfWeek3 = new Date(startOfCurrentWeek);
      startOfWeek3.setDate(startOfCurrentWeek.getDate() + 14); // 2 weeks forward

      // Generate posts for week 3
      const channels = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter'];
      const postTypes = ['Image', 'Video', 'Article', 'Carousel'];

      // Create 3 posts for that week
      const newPosts = [];

      for (let i = 0; i < 3; i++) {
        const postDate = new Date(startOfWeek3);
        postDate.setDate(postDate.getDate() + i * 2); // Space them out by 2 days

        newPosts.push({
          title: `Generated Post ${i + 1}`,
          content: `AI generated content for your social media campaign.`,
          channel: channels[Math.floor(Math.random() * channels.length)],
          post_type: postTypes[Math.floor(Math.random() * postTypes.length)],
          scheduled_date: postDate.toISOString(),
          status: 'draft',
          calendar_id: id,
          user_id: user?.id,
          engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
        });
      }

      // Save to Supabase
      const { data, error } = await supabase.from('calendar_posts').insert(newPosts).select();

      if (error) {
        console.error('Error generating new week:', error);
        toast.error('Failed to generate new week of content');
        return;
      }

      // Update local state
      setPosts(prevPosts => [...prevPosts, ...data]);

      // Re-group posts including the new ones
      const allPosts = [...posts, ...data];
      const grouped = groupPostsByWeek(allPosts);
      setGroupedPosts(grouped);

      toast.success('New week of content generated!');

      // Switch to the week containing the new content
      setActiveWeek(2);
    } catch (error) {
      console.error('Error generating new week:', error);
      toast.error('Failed to generate new week of content');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Handle suggestion action
  const handleSuggestionAction = suggestion => {
    if (suggestion.actionRoute) {
      router.push(suggestion.actionRoute);
    }
  };

  // Create week tabs with day labels
  const getWeekDates = weekIndex => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // Adjust for the week index
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  };

  // Format date to readable string
  const formatDate = date => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Post placeholder for empty days
  function EmptyDayPlaceholder({ date }) {
    return (
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
  }

  // Get posts for the current day
  const getPostsForDay = date => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Debug which posts we're trying to get for this day
    const postsForWeek = groupedPosts[activeWeek] || [];
    
    // TEMPORARY FIX: For testing, distribute posts across days of the week
    // This ensures we can see the posts on screen to verify they're loading correctly
    const dayIndex = date.getDay(); // 0-6 for Sunday-Saturday
    
    // For testing: Just show posts on Monday and Wednesday to verify they appear
    if (dayIndex === 1 || dayIndex === 3) {
      // Show all posts for this week on these days 
      log.info(`TEMPORARY FIX: Showing posts on ${dateStr}`, {
        dayOfWeek: dayIndex,
        postsShown: postsForWeek.length
      });
      
      // For the first two posts on Monday, rest on Wednesday
      if (dayIndex === 1) {
        return postsForWeek.slice(0, 3); // First 3 posts on Monday
      } else {
        return postsForWeek.slice(3); // Remaining posts on Wednesday
      }
    }
    
    // Original filtering logic (commented out temporarily)
    /* 
    log.debug(`Getting posts for day ${dateStr}`, { 
      dateRequested: dateStr,
      activeWeek,
      totalPostsInActiveWeek: postsForWeek.length,
      allPostsInWeek: postsForWeek.map(p => ({
        id: p.id,
        date: new Date(p.scheduled_date).toISOString().split('T')[0],
        title: p.title
      }))
    });
    
    const filteredPosts = postsForWeek.filter(post => {
      const postDateStr = new Date(post.scheduled_date).toISOString().split('T')[0];
      const matches = postDateStr === dateStr;
      
      // Debug each post's matching logic
      log.debug(`Post date comparison for day ${dateStr}`, {
        postId: post.id,
        postDate: postDateStr,
        requestedDate: dateStr,
        matches
      });
      
      return matches;
    });
    
    log.debug(`Found ${filteredPosts.length} posts for day ${dateStr}`);
    
    return filteredPosts;
    */
    
    // Return no posts for other days
    return [];
  };

  // Log posts in the debug panel for the current week
  useEffect(() => {
    if (groupedPosts[activeWeek]?.length > 0) {
      log.debug(`Week ${activeWeek} posts`, { 
        postsCount: groupedPosts[activeWeek].length,
        posts: groupedPosts[activeWeek]
      });
    }
  }, [activeWeek, groupedPosts]);
  
  // Add debugging for posts that might not be showing up
  useEffect(() => {
    if (posts.length > 0) {
      log.info('Posts loaded but not displaying - debugging info', {
        rawPosts: posts,
        groupedPostsEmpty: groupedPosts.every(week => week.length === 0),
        activePosts: groupedPosts[activeWeek],
        firstPostScheduledDate: posts[0]?.scheduled_date,
        dateComparison: {
          postDate: new Date(posts[0]?.scheduled_date).toISOString(),
          todayDate: new Date().toISOString(),
          weekNumber: getWeekNumber(posts[0]?.scheduled_date)
        },
        weekDates: getWeekDates(activeWeek).map(date => date.toISOString().split('T')[0]),
        postDates: posts.map(post => ({
          id: post.id,
          date: new Date(post.scheduled_date).toISOString().split('T')[0],
          weekNumber: getWeekNumber(post.scheduled_date),
          visible: getWeekNumber(post.scheduled_date) === activeWeek
        }))
      });
    }
  }, [posts, groupedPosts, activeWeek]);

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
            { name: 'Content Management', href: `/calendar/${id}` },
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
                <p className={styles.dashboardSubtitle}>
                  {calendar?.name || 'Your content calendar'}
                </p>
                
                {/* Temporary info message about the fix */}
                <div style={{ 
                  backgroundColor: '#ffedd5', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  marginTop: '8px',
                  border: '1px solid #fdba74',
                  fontSize: '14px'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>Note:</strong> Posts are temporarily displayed on Monday and Wednesday for testing. 
                    We're fixing a date calculation issue.
                  </p>
                </div>
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
                  <p>
                    It's been {lastUpdatedWeeks} weeks since you updated your strategy. Time for a
                    refresh?
                  </p>
                  <Link
                    href={`/strategy/refresh?strategyId=${calendar?.strategy_id}`}
                    className={styles.bannerButton}
                  >
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
                  <h2 className={styles.sectionTitle}>3-Week Content Calendar</h2>

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
                      const dayPosts = getPostsForDay(date);

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
                <MetricsSummary calendarId={id} metrics={metrics} />

                {/* AI Suggestions Panel */}
                <SuggestionsPanel
                  calendarId={id}
                  suggestions={suggestions}
                  onSuggestionAction={handleSuggestionAction}
                />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
