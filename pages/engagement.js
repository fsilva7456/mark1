import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import BreadcrumbNavigation from '../components/BreadcrumbNavigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

export default function EngagementInputPage() {
  const router = useRouter();
  const { calendarId } = router.query;
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  
  // Form state for metrics
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    // Fetch posts when calendarId is available
    if (calendarId && user) {
      fetchPosts();
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [calendarId, user, loading, router]);
  
  const fetchPosts = async () => {
    setIsLoading(true);
    
    // For now, just set sample posts
    // This would be replaced with an actual API call
    setTimeout(() => {
      setPosts([
        {
          id: 'post1',
          title: 'Summer Collection Launch',
          channel: 'Instagram',
          status: 'published',
          scheduled_date: '2023-08-15',
          published_date: '2023-08-15',
        },
        {
          id: 'post2',
          title: 'Behind the Scenes',
          channel: 'Facebook',
          status: 'published',
          scheduled_date: '2023-08-17',
          published_date: '2023-08-17',
        },
        {
          id: 'post3',
          title: 'Customer Testimonial',
          channel: 'Instagram',
          status: 'published',
          scheduled_date: '2023-08-20',
          published_date: '2023-08-20',
        },
      ]);
      
      // Initialize metrics state
      const initialMetrics = {};
      posts.forEach(post => {
        initialMetrics[post.id] = {
          likes: 0,
          comments: 0,
          shares: 0
        };
      });
      setMetrics(initialMetrics);
      
      setIsLoading(false);
    }, 1000);
  };
  
  const handleMetricChange = (postId, metricType, value) => {
    setMetrics(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [metricType]: parseInt(value) || 0
      }
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // This would be replaced with an actual API call
    setTimeout(() => {
      toast.success('Engagement metrics saved successfully!');
      setIsLoading(false);
      router.push(`/calendar/${calendarId}`);
    }, 1500);
  };
  
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Enter Engagement Metrics | Mark1</title>
        <meta name="description" content="Track and enter engagement metrics for your content" />
      </Head>
      
      <main className={styles.mainContent}>
        <BreadcrumbNavigation
          path={[
            { name: 'Dashboard', href: '/' },
            { name: 'Content Calendar', href: `/calendar/${calendarId}` },
            { name: 'Engagement Metrics', href: `/engagement?calendarId=${calendarId}` }
          ]}
        />
        
        <h1 className={styles.pageTitle}>Enter Engagement Metrics</h1>
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading published posts...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.metricsForm}>
            {posts.length > 0 ? (
              <>
                <div className={styles.metricsTable}>
                  <div className={styles.metricsTableHeader}>
                    <div className={styles.metricsTableCell}>Post</div>
                    <div className={styles.metricsTableCell}>Platform</div>
                    <div className={styles.metricsTableCell}>Date</div>
                    <div className={styles.metricsTableCell}>Likes</div>
                    <div className={styles.metricsTableCell}>Comments</div>
                    <div className={styles.metricsTableCell}>Shares</div>
                  </div>
                  
                  {posts.map(post => (
                    <div key={post.id} className={styles.metricsTableRow}>
                      <div className={styles.metricsTableCell}>{post.title}</div>
                      <div className={styles.metricsTableCell}>{post.channel}</div>
                      <div className={styles.metricsTableCell}>
                        {new Date(post.published_date).toLocaleDateString()}
                      </div>
                      <div className={styles.metricsTableCell}>
                        <input 
                          type="number" 
                          min="0"
                          value={metrics[post.id]?.likes || 0}
                          onChange={(e) => handleMetricChange(post.id, 'likes', e.target.value)}
                          className={styles.metricInput}
                        />
                      </div>
                      <div className={styles.metricsTableCell}>
                        <input 
                          type="number" 
                          min="0"
                          value={metrics[post.id]?.comments || 0}
                          onChange={(e) => handleMetricChange(post.id, 'comments', e.target.value)}
                          className={styles.metricInput}
                        />
                      </div>
                      <div className={styles.metricsTableCell}>
                        <input 
                          type="number" 
                          min="0"
                          value={metrics[post.id]?.shares || 0}
                          onChange={(e) => handleMetricChange(post.id, 'shares', e.target.value)}
                          className={styles.metricInput}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Metrics'}
                  </button>
                  <Link href={`/calendar/${calendarId}`} className={styles.secondaryButton}>
                    Cancel
                  </Link>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p>No published posts found for this calendar.</p>
                <Link href={`/calendar/${calendarId}`} className={styles.secondaryButton}>
                  Back to Calendar
                </Link>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
} 