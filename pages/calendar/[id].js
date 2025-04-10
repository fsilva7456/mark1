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
  ChartPieIcon 
} from '@heroicons/react/24/outline';

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
  const [activeTab, setActiveTab] = useState('upcoming');
  
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
      clickThrough: 0
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
      fetchCalendarDetails(id);
    }
  }, [id, user, loading, router]);
  
  const fetchCalendarDetails = async (calendarId) => {
    try {
      setIsLoading(true);
      console.log('Fetching calendar details for ID:', calendarId);
      
      // Fetch calendar data
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', calendarId)
        .single();
      
      if (calendarError) {
        console.error('Error fetching calendar:', calendarError);
        setError('Failed to load calendar data. Please try again.');
        setIsLoading(false);
        return;
      }
      
      console.log('Calendar data retrieved:', calendarData);
      
      // Fetch posts for this calendar
      const { data: postsData, error: postsError } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('scheduled_date', { ascending: true });
      
      if (postsError) {
        console.error('Error fetching calendar posts:', postsError);
        setError('Failed to load calendar posts. Please try again.');
        setIsLoading(false);
        return;
      }
      
      console.log('Posts data retrieved:', postsData ? postsData.length : 0, 'posts');
      
      // Process posts and set state
      if (postsData && postsData.length > 0) {
        setPosts(postsData);
        calculateMetrics(postsData);
        generateSuggestions(postsData, calendarData);
      } else {
        // Handle case with no posts
        await createDefaultPosts(calendarId, calendarData);
      }
      
      setCalendar(calendarData);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      setError('Failed to load calendar details. Please try again.');
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
    let totalClicks = 0;
    
    postsData.forEach(post => {
      if (post.engagement) {
        totalLikes += post.engagement.likes || 0;
        totalComments += post.engagement.comments || 0;
        totalShares += post.engagement.shares || 0;
        totalClicks += post.engagement.clicks || 0;
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
        shares: totalShares,
        clickThrough: totalClicks
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

  // Handle suggestion actions
  const handleSuggestionAction = (action) => {
    switch (action) {
      case 'Create content':
        // Navigate to content creation for posts that need content
        const firstEmptyPost = posts.find(post => 
          post.status === 'scheduled' && 
          new Date(post.scheduled_date) > new Date() &&
          (!post.content || post.content.trim() === '')
        );
        if (firstEmptyPost) {
          router.push(`/calendar/${id}/post/${firstEmptyPost.id}`);
        }
        break;
        
      case 'Schedule posts':
        // Navigate to new post creation
        router.push(`/calendar/${id}/post/new`);
        break;
        
      case 'Update strategy':
        // Navigate to strategy page
        if (calendar?.strategy_id) {
          router.push(`/strategy/${calendar.strategy_id}`);
        } else {
          router.push('/marketing-plan');
        }
        break;
        
      case 'Create outline':
        // Navigate to content outline creation
        if (calendar?.strategy_id) {
          router.push(`/content/new?strategyId=${calendar.strategy_id}`);
        } else {
          router.push('/marketing-plan');
        }
        break;
        
      case 'View analytics':
        // Navigate to analytics page (if it exists)
        router.push(`/calendar/${id}/analytics`);
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  // New function to create default posts when no content plan exists
  const createDefaultPosts = async (calendarId, calendarData) => {
    try {
      console.log('Creating default posts for calendar');
      
      const postTypes = ['Image Post', 'Carousel', 'Video', 'Story', 'Reel'];
      const channels = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'];
      const startDate = new Date();
      const newPosts = [];
      
      // Create 8 default posts over 4 weeks
      for (let week = 0; week < 4; week++) {
        for (let postIndex = 0; postIndex < 2; postIndex++) {
          const postDate = new Date(startDate);
          postDate.setDate(postDate.getDate() + (week * 7) + (postIndex * 3)); // Posts every 3 days
          
          const postType = postTypes[Math.floor(Math.random() * postTypes.length)];
          const channel = channels[Math.floor(Math.random() * channels.length)];
          
          newPosts.push({
            calendar_id: calendarId,
            title: `Week ${week + 1} ${postType} for ${channel}`,
            content: `Default content for ${calendarData.name || 'your calendar'} - Week ${week + 1}`,
            post_type: postType,
            target_audience: 'General audience',
            scheduled_date: postDate.toISOString(),
            channel: channel,
            status: 'scheduled',
            user_id: user.id,
            engagement: {
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              clicks: 0
            }
          });
        }
      }
      
      console.log('Created', newPosts.length, 'default posts');
      
      // Add posts to the database
      const { data: insertedPosts, error: insertError } = await supabase
        .from('calendar_posts')
        .insert(newPosts)
        .select();
      
      if (insertError) {
        console.error('Error inserting default posts:', insertError);
        throw insertError;
      }
      
      console.log('Successfully inserted', insertedPosts.length, 'default posts');
      setPosts(insertedPosts);
      
      // Update calendar progress
      await updateCalendarProgress(calendarId, insertedPosts);
    } catch (error) {
      console.error('Error creating default posts:', error);
      setPosts([]); // Set empty posts array on error
    }
  };
  
  const updatePostStatus = async (postId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from('calendar_posts')
        .update({ status: newStatus })
        .eq('id', postId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setPosts(posts.map(post => 
        post.id === postId ? {...post, status: newStatus} : post
      ));
      
      toast.success(`Post marked as ${newStatus}`);
      
      // Update calendar progress
      updateCalendarProgress(calendar.id, posts);
    } catch (error) {
      console.error('Error updating post status:', error);
      toast.error('Failed to update post status');
    }
  };
  
  const updatePostEngagement = async (postId, engagement) => {
    try {
      const { data, error } = await supabase
        .from('calendar_posts')
        .update({ engagement })
        .eq('id', postId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setPosts(posts.map(post => 
        post.id === postId ? {...post, engagement} : post
      ));
      
      toast.success('Engagement metrics updated');
    } catch (error) {
      console.error('Error updating engagement metrics:', error);
      toast.error('Failed to update engagement metrics');
    }
  };
  
  const updateCalendarProgress = async (calendarId, postsData) => {
    try {
      // Calculate progress based on published posts
      const totalPosts = postsData.length;
      const publishedPosts = postsData.filter(post => post.status === 'published').length;
      const progress = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;
      
      // Update the calendar in the database
      const { data, error } = await supabase
        .from('calendars')
        .update({ 
          progress,
          posts_scheduled: totalPosts,
          posts_published: publishedPosts,
          modified_at: new Date().toISOString()
        })
        .eq('id', calendarId)
        .select();
      
      if (error) throw error;
      
      console.log('Updated calendar progress:', progress, '% complete');
      // Update local state
      setCalendar(prev => ({...prev, progress, posts_scheduled: totalPosts, posts_published: publishedPosts}));
    } catch (error) {
      console.error('Error updating calendar progress:', error);
    }
  };
  
  const addNewPost = async (newPost) => {
    try {
      const { data, error } = await supabase
        .from('calendar_posts')
        .insert([{
          calendar_id: id,
          ...newPost,
          status: 'scheduled',
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            clicks: 0
          }
        }])
        .select();
      
      if (error) throw error;
      
      // Update local state
      setPosts([...posts, data[0]]);
      toast.success('New post added to calendar');
      
      // Update calendar progress
      updateCalendarProgress(id, posts);
    } catch (error) {
      console.error('Error adding new post:', error);
      toast.error('Failed to add new post');
    }
  };
  
  // Get icon component based on name
  const getIconForSuggestion = (iconName) => {
    switch (iconName) {
      case 'pencil':
        return <PencilIcon className={styles.suggestionIcon} />;
      case 'calendar':
        return <CalendarIcon className={styles.suggestionIcon} />;
      case 'refresh':
        return <ArrowPathIcon className={styles.suggestionIcon} />;
      case 'document':
        return <DocumentPlusIcon className={styles.suggestionIcon} />;
      case 'chart':
        return <ChartPieIcon className={styles.suggestionIcon} />;
      default:
        return <LightBulbIcon className={styles.suggestionIcon} />;
    }
  };
  
  // Get filtered posts based on active tab
  const getFilteredPosts = () => {
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return posts
          .filter(post => 
            post.status === 'scheduled' && 
            new Date(post.scheduled_date) > now
          )
          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
          .slice(0, 5);
          
      case 'needsContent':
        return posts
          .filter(post => 
            post.status === 'scheduled' && 
            new Date(post.scheduled_date) > now &&
            (!post.content || post.content.trim() === '')
          )
          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
          
      case 'published':
        return posts
          .filter(post => post.status === 'published')
          .sort((a, b) => new Date(b.published_date || b.scheduled_date) - new Date(a.published_date || a.scheduled_date));
          
      case 'all':
      default:
        return posts
          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    }
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

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
                <Link href={`/calendar/${id}/post/new`} className={styles.primaryButton}>
                  + Create New Post
                </Link>
              </div>
            </div>
            
            {/* Dashboard layout with 3 main sections */}
            <div className={styles.dashboardGrid}>
              {/* Left column: Key metrics */}
              <section className={styles.metricsSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <ChartBarIcon className={styles.sectionIcon} />
                    Performance Metrics
                  </h2>
                </div>
                
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{metrics.totalPosts}</div>
                    <div className={styles.metricLabel}>Total Posts</div>
                  </div>
                  
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{metrics.published}</div>
                    <div className={styles.metricLabel}>Published</div>
                  </div>
                  
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{metrics.scheduled}</div>
                    <div className={styles.metricLabel}>Scheduled</div>
                  </div>
                  
                  <div className={styles.metricCard}>
                    <div className={styles.metricValue}>{metrics.drafts}</div>
                    <div className={styles.metricLabel}>Drafts</div>
                  </div>
                </div>
                
                <div className={styles.engagementMetrics}>
                  <h3 className={styles.engagementTitle}>Engagement</h3>
                  
                  <div className={styles.engagementGrid}>
                    <div className={styles.engagementMetric}>
                      <div className={styles.engagementValue}>{metrics.engagement.likes}</div>
                      <div className={styles.engagementLabel}>Likes</div>
                    </div>
                    
                    <div className={styles.engagementMetric}>
                      <div className={styles.engagementValue}>{metrics.engagement.comments}</div>
                      <div className={styles.engagementLabel}>Comments</div>
                    </div>
                    
                    <div className={styles.engagementMetric}>
                      <div className={styles.engagementValue}>{metrics.engagement.shares}</div>
                      <div className={styles.engagementLabel}>Shares</div>
                    </div>
                    
                    <div className={styles.engagementMetric}>
                      <div className={styles.engagementValue}>{metrics.engagement.clickThrough}</div>
                      <div className={styles.engagementLabel}>Clicks</div>
                    </div>
                  </div>
                  
                  <div className={styles.performanceScore}>
                    <div className={styles.scoreLabel}>Performance Score</div>
                    <div className={styles.scoreBar}>
                      <div 
                        className={styles.scoreValue}
                        style={{ width: `${metrics.performanceScore}%` }}
                      />
                    </div>
                    <div className={styles.scoreNumber}>{metrics.performanceScore}%</div>
                  </div>
                </div>
              </section>
              
              {/* Center column: Upcoming content */}
              <section className={styles.contentSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <CalendarIcon className={styles.sectionIcon} />
                    Upcoming Content
                  </h2>
                  
                  <div className={styles.tabGroup}>
                    <button
                      className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('upcoming')}
                    >
                      Next Up
                    </button>
                    <button
                      className={`${styles.tabButton} ${activeTab === 'needsContent' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('needsContent')}
                    >
                      Needs Content
                    </button>
                    <button
                      className={`${styles.tabButton} ${activeTab === 'published' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('published')}
                    >
                      Published
                    </button>
                    <button
                      className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      View All
                    </button>
                  </div>
                </div>
                
                <div className={styles.contentCards}>
                  {getFilteredPosts().length > 0 ? (
                    getFilteredPosts().map(post => (
                      <div key={post.id} className={styles.contentCard}>
                        <div className={styles.contentCardHeader}>
                          <div className={styles.contentMeta}>
                            <span className={styles.contentPlatform}>{post.channel || 'Instagram'}</span>
                            <span className={styles.contentDate}>{formatDate(post.scheduled_date)}</span>
                          </div>
                          <div className={`${styles.contentStatus} ${styles[post.status]}`}>
                            {post.status === 'published' && 'Published'}
                            {post.status === 'scheduled' && 'Scheduled'}
                            {post.status === 'draft' && 'Draft'}
                          </div>
                        </div>
                        
                        <h3 className={styles.contentTitle}>{post.title}</h3>
                        
                        <div className={styles.contentType}>{post.post_type || 'Post'}</div>
                        
                        {(!post.content || post.content.trim() === '') && post.status === 'scheduled' ? (
                          <div className={styles.contentNeeded}>
                            <span className={styles.contentNeededLabel}>Content needed</span>
                            <Link href={`/calendar/${id}/post/${post.id}`} className={styles.contentNeededButton}>
                              Create Now
                            </Link>
                          </div>
                        ) : (
                          <p className={styles.contentExcerpt}>
                            {post.content ? (post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content) : 'No content yet'}
                          </p>
                        )}
                        
                        <div className={styles.contentCardFooter}>
                          <Link href={`/calendar/${id}/post/${post.id}`} className={styles.contentViewButton}>
                            {post.status === 'published' ? 'View Details' : 'Edit Post'}
                          </Link>
                          
                          {post.status === 'published' && post.engagement && (
                            <div className={styles.miniEngagement}>
                              <span>{post.engagement.likes || 0} likes</span>
                              <span>{post.engagement.comments || 0} comments</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyContent}>
                      <p>No {activeTab === 'upcoming' ? 'upcoming' : activeTab === 'needsContent' ? 'posts needing content' : activeTab === 'published' ? 'published posts' : 'posts'} found.</p>
                      <Link href={`/calendar/${id}/post/new`} className={styles.emptyContentAction}>
                        Create a new post
                      </Link>
                    </div>
                  )}
                </div>
                
                <div className={styles.contentFooter}>
                  <Link href={`/calendar/${id}/view`} className={styles.viewAllButton}>
                    View Full Calendar
                  </Link>
                </div>
              </section>
              
              {/* Right column: Suggestions */}
              <section className={styles.suggestionsSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <LightBulbIcon className={styles.sectionIcon} />
                    Suggestions & Next Steps
                  </h2>
                </div>
                
                <div className={styles.suggestionsList}>
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className={`${styles.suggestionCard} ${styles[suggestion.priority]}`}
                      >
                        <div className={styles.suggestionIcon}>
                          {getIconForSuggestion(suggestion.icon)}
                        </div>
                        
                        <div className={styles.suggestionContent}>
                          <h3 className={styles.suggestionTitle}>{suggestion.title}</h3>
                          <p className={styles.suggestionDescription}>{suggestion.description}</p>
                          
                          <button 
                            className={styles.suggestionButton}
                            onClick={() => handleSuggestionAction(suggestion.action)}
                          >
                            {suggestion.action}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptySuggestions}>
                      <p>No suggestions yet. Keep creating and publishing content!</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 