import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Navbar from '../../components/Navbar';
import BreadcrumbNavigation from '../../components/BreadcrumbNavigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

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

export default function CalendarManagement() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const [calendar, setCalendar] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scheduled');
  
  // States for filtering and sorting
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  
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
      
      // If no posts exist yet, create posts from content plan or defaults
      if (!postsData || postsData.length === 0) {
        console.log('No posts found, checking for content plan...');
        
        // Get the content plan associated with this calendar - modified to not use .single()
        const { data: contentPlans, error: contentError } = await supabase
          .from('content_plans')
          .select('*')
          .eq('calendar_id', calendarId);
        
        if (contentError) {
          console.error('Error fetching content plan:', contentError);
        }
        
        // Use the first content plan if any exist
        const contentPlan = contentPlans && contentPlans.length > 0 ? contentPlans[0] : null;
        console.log('Content plan retrieved:', contentPlan ? 'Yes' : 'No');
        
        if (contentPlan && contentPlan.campaigns && Array.isArray(contentPlan.campaigns)) {
          // Create posts from the content plan
          const newPosts = [];
          const startDate = new Date();
          
          console.log('Creating posts from content plan with', contentPlan.campaigns.length, 'weeks');
          
          contentPlan.campaigns.forEach((week, weekIndex) => {
            if (week.posts && Array.isArray(week.posts)) {
              week.posts.forEach((post, postIndex) => {
                const postDate = new Date(startDate);
                postDate.setDate(postDate.getDate() + (weekIndex * 7) + postIndex);
                
                newPosts.push({
                  calendar_id: calendarId,
                  title: post.topic || `Week ${weekIndex + 1} Post ${postIndex + 1}`,
                  content: post.topic || `Content for week ${weekIndex + 1}`,
                  post_type: post.type || 'Post',
                  target_audience: post.audience || 'General audience',
                  scheduled_date: postDate.toISOString(),
                  channel: post.channel || 'Instagram',
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
              });
            } else {
              console.warn('Week', weekIndex, 'has no posts array or is not formatted correctly');
            }
          });
          
          console.log('Created', newPosts.length, 'new posts from content plan');
          
          // Add posts to the database
          if (newPosts.length > 0) {
            const { data: insertedPosts, error: insertError } = await supabase
              .from('calendar_posts')
              .insert(newPosts)
              .select();
            
            if (insertError) {
              console.error('Error inserting new posts:', insertError);
              throw insertError;
            }
            
            console.log('Successfully inserted', insertedPosts.length, 'posts');
            setPosts(insertedPosts);
            
            // Update calendar progress
            await updateCalendarProgress(calendarId, insertedPosts);
          } else {
            console.log('No posts to insert from content plan, creating default posts');
            await createDefaultPosts(calendarId, calendarData);
          }
        } else {
          // No content plan or no campaigns, create default posts
          console.log('No valid content plan found, creating default posts');
          await createDefaultPosts(calendarId, calendarData);
        }
      } else {
        // Use existing posts
        console.log('Using existing', postsData.length, 'posts');
        setPosts(postsData);
      }
      
      setCalendar(calendarData);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      setError('Failed to load calendar details. Please try again.');
    } finally {
      setIsLoading(false);
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
  
  // Filter posts based on active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    return post.status === activeTab;
  });

  // Handle post drag and drop for rescheduling
  const movePost = async (dragIndex, hoverIndex) => {
    const dragPost = posts[dragIndex];
    const targetPost = posts[hoverIndex];
    
    if (!dragPost || !targetPost) return;
    
    // Create new array
    const updatedPosts = [...posts];
    
    // Swap scheduled dates between the drag post and hover post
    const dragDate = new Date(dragPost.scheduled_date);
    const hoverDate = new Date(targetPost.scheduled_date);
    
    // Update posts in state
    updatedPosts[dragIndex] = { ...dragPost, scheduled_date: hoverDate.toISOString() };
    updatedPosts[hoverIndex] = { ...targetPost, scheduled_date: dragDate.toISOString() };
    
    // Update state
    setPosts(updatedPosts);
    
    // Save changes to database
    try {
      const updates = [
        { id: dragPost.id, scheduled_date: hoverDate.toISOString() },
        { id: targetPost.id, scheduled_date: dragDate.toISOString() }
      ];
      
      for (const update of updates) {
        const { error } = await supabase
          .from('calendar_posts')
          .update({ scheduled_date: update.scheduled_date })
          .eq('id', update.id);
          
        if (error) throw error;
      }
      
      toast.success('Post rescheduled successfully');
    } catch (error) {
      console.error('Error updating post dates:', error);
      toast.error('Failed to reschedule post');
      
      // Revert changes on failure
      fetchCalendarDetails(id);
    }
  };
  
  // Bulk actions state
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Toggle post selection for bulk actions
  const togglePostSelection = (postId) => {
    if (selectedPosts.includes(postId)) {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    } else {
      setSelectedPosts([...selectedPosts, postId]);
    }
    
    // Show bulk actions bar when at least one post is selected
    setShowBulkActions(selectedPosts.length > 0);
  };
  
  // Bulk status update
  const bulkUpdateStatus = async (newStatus) => {
    if (selectedPosts.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('calendar_posts')
        .update({ status: newStatus })
        .in('id', selectedPosts);
        
      if (error) throw error;
      
      // Update local state
      setPosts(posts.map(post => 
        selectedPosts.includes(post.id) 
          ? { ...post, status: newStatus } 
          : post
      ));
      
      toast.success(`${selectedPosts.length} posts updated to ${newStatus}`);
      setSelectedPosts([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error updating post status:', error);
      toast.error('Failed to update posts');
    }
  };
  
  // Bulk delete
  const bulkDeletePosts = async () => {
    if (selectedPosts.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedPosts.length} posts? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('calendar_posts')
        .delete()
        .in('id', selectedPosts);
        
      if (error) throw error;
      
      // Update local state
      setPosts(posts.filter(post => !selectedPosts.includes(post.id)));
      
      toast.success(`${selectedPosts.length} posts deleted`);
      setSelectedPosts([]);
      setShowBulkActions(false);
      
      // Update calendar progress
      await updateCalendarProgress(id, posts.filter(post => !selectedPosts.includes(post.id)));
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.error('Failed to delete posts');
    }
  };
  
  // Post preview state
  const [previewPost, setPreviewPost] = useState(null);
  
  // Toggle post preview
  const togglePostPreview = (post) => {
    setPreviewPost(previewPost ? null : post);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{calendar?.name || 'Content Calendar'} | Mark1</title>
        <meta name="description" content="Manage your content calendar and scheduled posts" />
      </Head>
      
      <Navbar />
      
      <main className={styles.main}>
        <BreadcrumbNavigation 
          path={[
            { name: 'Dashboard', href: '/' },
            { name: 'Marketing Plan', href: '/marketing-plan' },
            { name: calendar?.name || 'Calendar', href: `/calendar/${id}` }
          ]}
        />
      
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading calendar...</p>
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
            <div className={styles.calendarHeader}>
              <div>
                <h1 className={styles.calendarTitle}>{calendar?.name || 'Content Calendar'}</h1>
                {calendar?.description && (
                  <p className={styles.calendarDescription}>{calendar.description}</p>
                )}
              </div>
              
              <div className={styles.calendarActions}>
                <Link href={`/calendar/${id}/post/new`} className={styles.newPostButton}>
                  + New Post
                </Link>
                <button onClick={() => handleGenerateReport()} className={styles.reportButton}>
                  Generate Report
                </button>
              </div>
            </div>

            {/* Calendar filters */}
            <div className={styles.calendarFilters}>
              <div className={styles.tabsContainer}>
                <button 
                  className={`${styles.tab} ${activeTab === 'scheduled' ? styles.active : ''}`}
                  onClick={() => setActiveTab('scheduled')}
                >
                  Scheduled
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'draft' ? styles.active : ''}`}
                  onClick={() => setActiveTab('draft')}
                >
                  Drafts
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'published' ? styles.active : ''}`}
                  onClick={() => setActiveTab('published')}
                >
                  Published
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Posts
                </button>
              </div>
              
              <div className={styles.filtersContainer}>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="date">Sort by Date</option>
                  <option value="platform">Sort by Platform</option>
                  <option value="title">Sort by Title</option>
                </select>
                
                <button 
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className={styles.sortDirectionButton}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            
            {/* Bulk action bar */}
            {selectedPosts.length > 0 && (
              <div className={styles.bulkActions}>
                <span className={styles.bulkActionsTitle}>
                  {selectedPosts.length} posts selected
                </span>
                <button 
                  onClick={() => bulkUpdateStatus('draft')}
                  className={styles.bulkActionsButton}
                >
                  Mark as Draft
                </button>
                <button 
                  onClick={() => bulkUpdateStatus('scheduled')}
                  className={styles.bulkActionsButton}
                >
                  Schedule
                </button>
                <button 
                  onClick={() => bulkUpdateStatus('published')}
                  className={styles.bulkActionsButton}
                >
                  Mark as Published
                </button>
                <button 
                  onClick={bulkDeletePosts}
                  className={`${styles.bulkActionsButton} ${styles.destructive}`}
                >
                  Delete
                </button>
              </div>
            )}
            
            {/* Post listing with drag and drop */}
            <DndProvider backend={HTML5Backend}>
              <div className={styles.postsContainer}>
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post, index) => (
                    <PostItem 
                      key={post.id}
                      post={post}
                      index={index}
                      movePost={movePost}
                      isSelected={selectedPosts.includes(post.id)}
                      toggleSelection={togglePostSelection}
                      togglePreview={togglePostPreview}
                    />
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <p>No posts found for the selected filters.</p>
                    <Link href={`/calendar/${id}/post/new`} className={styles.emptyStateAction}>
                      Create your first post
                    </Link>
                  </div>
                )}
              </div>
            </DndProvider>
            
            {/* Post preview modal */}
            {previewPost && (
              <div className={styles.previewModal} onClick={() => setPreviewPost(null)}>
                <div className={styles.previewContent} onClick={e => e.stopPropagation()}>
                  <button 
                    className={styles.previewClose}
                    onClick={() => setPreviewPost(null)}
                  >
                    ×
                  </button>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewPlatform}>
                      {previewPost.platform || 'Instagram'}
                    </span>
                    <h2 className={styles.previewTitle}>{previewPost.title}</h2>
                    <div className={styles.previewMeta}>
                      <span>Scheduled for: {new Date(previewPost.scheduled_date).toLocaleDateString()}</span>
                      <span>Status: {previewPost.status}</span>
                    </div>
                  </div>
                  <div className={styles.previewBody}>
                    {previewPost.content}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Draggable post item component
const PostItem = ({ post, index, movePost, isSelected, toggleSelection, togglePreview }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'POST',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'POST',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        movePost(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });
  
  return (
    <div 
      ref={node => drag(drop(node))}
      className={`${styles.postCard} ${styles[post.status]} ${isDragging ? styles.dragging : ''} ${isSelected ? styles.selected : ''}`}
    >
      <div className={styles.postSelection}>
        <label className={styles.checkboxContainer}>
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => toggleSelection(post.id)}
          />
          <span className={styles.checkmark}></span>
        </label>
      </div>
      
      <div className={styles.postContent}>
        <div className={styles.postHeader}>
          <h3 className={styles.postTitle}>{post.title}</h3>
          <span className={`${styles.postPlatform} ${styles[post.platform?.toLowerCase()]}`}>
            {post.platform || 'Instagram'}
          </span>
        </div>
        
        <p className={styles.postExcerpt}>
          {post.content?.length > 100 
            ? post.content.substring(0, 100) + '...' 
            : post.content}
        </p>
        
        <div className={styles.postMeta}>
          <span className={styles.postDate}>
            {new Date(post.scheduled_date).toLocaleDateString()}
          </span>
          <span className={`${styles.postStatus} ${styles[post.status]}`}>
            {post.status}
          </span>
        </div>
      </div>
      
      <div className={styles.postActions}>
        <button 
          className={styles.previewButton}
          onClick={() => togglePreview(post)}
        >
          Preview
        </button>
        <Link 
          href={`/calendar/${post.calendar_id}/post/${post.id}`} 
          className={styles.editButton}
        >
          Edit
        </Link>
      </div>
    </div>
  );
}; 