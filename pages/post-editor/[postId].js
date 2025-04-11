import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import BreadcrumbNavigation from '../../components/BreadcrumbNavigation';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/Calendar.module.css';
import { toast } from 'react-hot-toast';

export default function PostEditorPage() {
  const router = useRouter();
  const { postId, calendarId } = router.query;
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    channel: '',
    post_type: '',
    scheduled_date: '',
    status: ''
  });
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    // Fetch post when postId is available
    if (postId && postId !== 'new' && user) {
      fetchPost();
    } else if (postId === 'new' && !loading) {
      // Set defaults for a new post
      setFormData({
        title: '',
        content: '',
        channel: 'Instagram',
        post_type: 'Image',
        scheduled_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      });
      setIsLoading(false);
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [postId, calendarId, user, loading, router]);
  
  const fetchPost = async () => {
    setIsLoading(true);
    
    // For now, just set a sample post
    // This would be replaced with an actual API call
    setTimeout(() => {
      const samplePost = {
        id: postId,
        title: 'Sample Post Title',
        content: 'This is sample content for the post. It would contain the actual caption or text for the social media post.',
        channel: 'Instagram',
        post_type: 'Image',
        scheduled_date: '2023-09-15',
        status: 'scheduled',
        calendar_id: calendarId || 'sample-calendar'
      };
      
      setPost(samplePost);
      setFormData({
        title: samplePost.title,
        content: samplePost.content,
        channel: samplePost.channel,
        post_type: samplePost.post_type,
        scheduled_date: samplePost.scheduled_date,
        status: samplePost.status
      });
      
      setIsLoading(false);
    }, 1000);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This would be replaced with an actual API call
    setTimeout(() => {
      toast.success(postId === 'new' ? 'Post created successfully!' : 'Post updated successfully!');
      setIsSubmitting(false);
      router.push(`/calendar/${calendarId || 'sample-calendar'}`);
    }, 1500);
  };
  
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{postId === 'new' ? 'Create New Post' : 'Edit Post'} | Mark1</title>
        <meta name="description" content="Create or edit your social media post" />
      </Head>
      
      <main className={styles.mainContent}>
        <BreadcrumbNavigation
          path={[
            { name: 'Dashboard', href: '/' },
            { name: 'Content Calendar', href: `/calendar/${calendarId || 'sample-calendar'}` },
            { name: postId === 'new' ? 'Create Post' : 'Edit Post', href: `/post-editor/${postId}?calendarId=${calendarId || 'sample-calendar'}` }
          ]}
        />
        
        <h1 className={styles.pageTitle}>{postId === 'new' ? 'Create New Post' : 'Edit Post'}</h1>
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading post data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.postForm}>
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.formLabel}>Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Enter post title"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="content" className={styles.formLabel}>Content</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="Enter post content or caption"
                rows={5}
                required
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="channel" className={styles.formLabel}>Platform</label>
                <select
                  id="channel"
                  name="channel"
                  value={formData.channel}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select platform</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="TikTok">TikTok</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="post_type" className={styles.formLabel}>Content Type</label>
                <select
                  id="post_type"
                  name="post_type"
                  value={formData.post_type}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select type</option>
                  <option value="Image">Image</option>
                  <option value="Carousel">Carousel</option>
                  <option value="Video">Video</option>
                  <option value="Story">Story</option>
                  <option value="Reel">Reel</option>
                </select>
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="scheduled_date" className={styles.formLabel}>Scheduled Date</label>
                <input
                  id="scheduled_date"
                  name="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="status" className={styles.formLabel}>Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            
            <div className={styles.mediaPreview}>
              <h3 className={styles.previewTitle}>Media Preview</h3>
              <div className={styles.mediaPlaceholder}>
                <p>Upload or drag & drop media here</p>
                <button type="button" className={styles.uploadButton}>Upload</button>
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="submit" 
                className={styles.primaryButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (postId === 'new' ? 'Create Post' : 'Update Post')}
              </button>
              <Link 
                href={`/calendar/${calendarId || 'sample-calendar'}`} 
                className={styles.secondaryButton}
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
} 