import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

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
        throw calendarError;
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
        throw postsError;
      }
      
      console.log('Posts data retrieved:', postsData ? postsData.length : 0, 'posts');
      
      // If no posts exist yet, create default posts from the content plan
      if (!postsData || postsData.length === 0) {
        console.log('No posts found, checking for content plan...');
        // Get the content plan associated with this calendar
        const { data: contentPlan, error: contentError } = await supabase
          .from('content_plans')
          .select('*')
          .eq('calendar_id', calendarId)
          .single();
        
        if (contentError) {
          console.error('Error fetching content plan:', contentError);
        }
        
        console.log('Content plan retrieved:', contentPlan ? 'Yes' : 'No');
        
        if (!contentError && contentPlan && contentPlan.campaigns) {
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
            console.log('No posts to insert');
            setPosts([]);
          }
        } else {
          // No content plan, just set empty posts array
          console.log('No content plan found or no campaigns in content plan');
          setPosts([]);
        }
      } else {
        // Use existing posts
        console.log('Using existing', postsData.length, 'posts');
        setPosts(postsData);
      }
      
      setCalendar(calendarData);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      setError('Failed to load calendar details.');
    } finally {
      setIsLoading(false);
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Manage Calendar | Mark1</title>
        <meta name="description" content="Manage your content calendar posts" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>{calendar?.name || 'Content Calendar'}</h1>
            <p>Plan, schedule, and track your content publishing and performance.</p>
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
              {/* Calendar Overview */}
              <div className={styles.calendarOverview}>
                <div className={styles.calendarStats}>
                  <div className={styles.statCard}>
                    <h3>Total Posts</h3>
                    <p>{posts.length}</p>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Published</h3>
                    <p>{posts.filter(post => post.status === 'published').length}</p>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Scheduled</h3>
                    <p>{posts.filter(post => post.status === 'scheduled').length}</p>
                  </div>
                  <div className={styles.statCard}>
                    <h3>Progress</h3>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${calendar?.progress || 0}%` }}
                        ></div>
                      </div>
                      <span>{calendar?.progress || 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.calendarActions}>
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`${styles.tabButton} ${activeTab === 'all' ? styles.active : ''}`}
                  >
                    All Posts
                  </button>
                  <button 
                    onClick={() => setActiveTab('scheduled')}
                    className={`${styles.tabButton} ${activeTab === 'scheduled' ? styles.active : ''}`}
                  >
                    Scheduled
                  </button>
                  <button 
                    onClick={() => setActiveTab('published')}
                    className={`${styles.tabButton} ${activeTab === 'published' ? styles.active : ''}`}
                  >
                    Published
                  </button>
                  <button 
                    onClick={() => document.getElementById('addPostModal').showModal()}
                    className={styles.addButton}
                  >
                    Add New Post
                  </button>
                </div>
              </div>
              
              {/* Calendar Posts Table */}
              <div className={styles.postsTableContainer}>
                <table className={styles.postsTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Post Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Engagement</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map(post => (
                        <tr key={post.id} className={styles.postRow}>
                          <td>{new Date(post.scheduled_date).toLocaleDateString()}</td>
                          <td>{post.title}</td>
                          <td>{post.post_type}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles[post.status]}`}>
                              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <div className={styles.engagementPreview}>
                              {post.status === 'published' ? (
                                <>
                                  <span>👍 {post.engagement?.likes || 0}</span>
                                  <span>💬 {post.engagement?.comments || 0}</span>
                                  <span>↗️ {post.engagement?.shares || 0}</span>
                                </>
                              ) : (
                                <span className={styles.notPublished}>Not published yet</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.postActions}>
                              <button
                                onClick={() => document.getElementById(`viewPostModal-${post.id}`).showModal()}
                                className={styles.viewButton}
                              >
                                View
                              </button>
                              
                              {post.status === 'scheduled' && (
                                <button
                                  onClick={() => updatePostStatus(post.id, 'published')}
                                  className={styles.publishButton}
                                >
                                  Mark Published
                                </button>
                              )}
                              
                              {post.status === 'published' && (
                                <button
                                  onClick={() => document.getElementById(`engagementModal-${post.id}`).showModal()}
                                  className={styles.engagementButton}
                                >
                                  Update Metrics
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className={styles.emptyState}>
                          No posts in this category
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Modals for post operations */}
              {posts.map(post => (
                <div key={`modals-${post.id}`}>
                  {/* View Post Modal */}
                  <dialog id={`viewPostModal-${post.id}`} className={styles.modal}>
                    <div className={styles.modalContent}>
                      <div className={styles.modalHeader}>
                        <h3>Post Details</h3>
                        <button 
                          onClick={() => document.getElementById(`viewPostModal-${post.id}`).close()}
                          className={styles.closeButton}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.modalBody}>
                        <div className={styles.postDetail}>
                          <strong>Title:</strong>
                          <p>{post.title}</p>
                        </div>
                        <div className={styles.postDetail}>
                          <strong>Type:</strong>
                          <p>{post.post_type}</p>
                        </div>
                        <div className={styles.postDetail}>
                          <strong>Date:</strong>
                          <p>{new Date(post.scheduled_date).toLocaleDateString()}</p>
                        </div>
                        <div className={styles.postDetail}>
                          <strong>Status:</strong>
                          <p>{post.status}</p>
                        </div>
                        <div className={styles.postDetail}>
                          <strong>Content:</strong>
                          <p>{post.content}</p>
                        </div>
                        <div className={styles.postDetail}>
                          <strong>Target Audience:</strong>
                          <p>{post.target_audience}</p>
                        </div>
                        {post.status === 'published' && (
                          <div className={styles.postDetail}>
                            <strong>Engagement:</strong>
                            <div className={styles.engagementMetrics}>
                              <div className={styles.metric}>
                                <span>Likes:</span>
                                <span>{post.engagement?.likes || 0}</span>
                              </div>
                              <div className={styles.metric}>
                                <span>Comments:</span>
                                <span>{post.engagement?.comments || 0}</span>
                              </div>
                              <div className={styles.metric}>
                                <span>Shares:</span>
                                <span>{post.engagement?.shares || 0}</span>
                              </div>
                              <div className={styles.metric}>
                                <span>Saves:</span>
                                <span>{post.engagement?.saves || 0}</span>
                              </div>
                              <div className={styles.metric}>
                                <span>Clicks:</span>
                                <span>{post.engagement?.clicks || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.modalFooter}>
                        <button 
                          onClick={() => document.getElementById(`viewPostModal-${post.id}`).close()}
                          className={styles.cancelButton}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </dialog>
                  
                  {/* Engagement Metrics Modal */}
                  {post.status === 'published' && (
                    <dialog id={`engagementModal-${post.id}`} className={styles.modal}>
                      <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                          <h3>Update Engagement Metrics</h3>
                          <button 
                            onClick={() => document.getElementById(`engagementModal-${post.id}`).close()}
                            className={styles.closeButton}
                          >
                            ×
                          </button>
                        </div>
                        <div className={styles.modalBody}>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.target;
                              updatePostEngagement(post.id, {
                                likes: parseInt(form.likes.value) || 0,
                                comments: parseInt(form.comments.value) || 0,
                                shares: parseInt(form.shares.value) || 0,
                                saves: parseInt(form.saves.value) || 0,
                                clicks: parseInt(form.clicks.value) || 0
                              });
                              document.getElementById(`engagementModal-${post.id}`).close();
                            }}
                            className={styles.engagementForm}
                          >
                            <div className={styles.formGroup}>
                              <label htmlFor={`likes-${post.id}`}>Likes:</label>
                              <input 
                                type="number" 
                                id={`likes-${post.id}`}
                                name="likes"
                                defaultValue={post.engagement?.likes || 0}
                                min="0"
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label htmlFor={`comments-${post.id}`}>Comments:</label>
                              <input 
                                type="number" 
                                id={`comments-${post.id}`}
                                name="comments"
                                defaultValue={post.engagement?.comments || 0}
                                min="0"
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label htmlFor={`shares-${post.id}`}>Shares:</label>
                              <input 
                                type="number" 
                                id={`shares-${post.id}`}
                                name="shares"
                                defaultValue={post.engagement?.shares || 0}
                                min="0"
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label htmlFor={`saves-${post.id}`}>Saves:</label>
                              <input 
                                type="number" 
                                id={`saves-${post.id}`}
                                name="saves"
                                defaultValue={post.engagement?.saves || 0}
                                min="0"
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label htmlFor={`clicks-${post.id}`}>Clicks/Link Taps:</label>
                              <input 
                                type="number" 
                                id={`clicks-${post.id}`}
                                name="clicks"
                                defaultValue={post.engagement?.clicks || 0}
                                min="0"
                              />
                            </div>
                            <div className={styles.formActions}>
                              <button type="submit" className={styles.saveButton}>
                                Save Metrics
                              </button>
                              <button 
                                type="button"
                                onClick={() => document.getElementById(`engagementModal-${post.id}`).close()}
                                className={styles.cancelButton}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </dialog>
                  )}
                </div>
              ))}
              
              {/* Add New Post Modal */}
              <dialog id="addPostModal" className={styles.modal}>
                <div className={styles.modalContent}>
                  <div className={styles.modalHeader}>
                    <h3>Add New Post</h3>
                    <button 
                      onClick={() => document.getElementById('addPostModal').close()}
                      className={styles.closeButton}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.modalBody}>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target;
                        addNewPost({
                          title: form.title.value,
                          content: form.content.value,
                          post_type: form.postType.value,
                          target_audience: form.audience.value,
                          scheduled_date: new Date(form.date.value).toISOString()
                        });
                        form.reset();
                        document.getElementById('addPostModal').close();
                      }}
                      className={styles.addPostForm}
                    >
                      <div className={styles.formGroup}>
                        <label htmlFor="title">Post Title:</label>
                        <input 
                          type="text" 
                          id="title"
                          name="title"
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="content">Content:</label>
                        <textarea 
                          id="content"
                          name="content"
                          rows="4"
                          required
                        ></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="postType">Post Type:</label>
                        <select id="postType" name="postType" required>
                          <option value="">Select a type</option>
                          <option value="Carousel">Carousel</option>
                          <option value="Image Post">Image Post</option>
                          <option value="Video">Video</option>
                          <option value="Story">Story</option>
                          <option value="Reel">Reel</option>
                          <option value="Text Post">Text Post</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="audience">Target Audience:</label>
                        <input 
                          type="text" 
                          id="audience"
                          name="audience"
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="date">Scheduled Date:</label>
                        <input 
                          type="date" 
                          id="date"
                          name="date"
                          required
                        />
                      </div>
                      <div className={styles.formActions}>
                        <button type="submit" className={styles.saveButton}>
                          Add Post
                        </button>
                        <button 
                          type="button"
                          onClick={() => document.getElementById('addPostModal').close()}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </dialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 