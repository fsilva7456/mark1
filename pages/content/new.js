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
    
    // In a real app, this would call an AI API
    // For now, we'll generate mock content ideas
    setTimeout(() => {
      const mockContent = [
        {
          week: 1,
          theme: "Introduction to your approach",
          posts: [
            { type: "Carousel", topic: "5 myths about fitness debunked" },
            { type: "Video", topic: "Quick demo of your training style" },
            { type: "Story", topic: "Behind the scenes of your business" }
          ]
        },
        {
          week: 2,
          theme: "Client success stories",
          posts: [
            { type: "Transformation", topic: "Before & after of a client" },
            { type: "Testimonial", topic: "Client interview about their journey" },
            { type: "Carousel", topic: "3 key habits that lead to success" }
          ]
        },
        {
          week: 3,
          theme: "Education series",
          posts: [
            { type: "Carousel", topic: "The science behind your methods" },
            { type: "Video", topic: "Common form mistakes to avoid" },
            { type: "Reel", topic: "Quick tips for better results" }
          ]
        },
      ];
      
      setContentOutline(mockContent);
      setIsLoading(false);
    }, 2000);
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className={styles.actions}>
                <button onClick={handleSaveCalendar} className={styles.saveButton}>
                  Save Content Calendar
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