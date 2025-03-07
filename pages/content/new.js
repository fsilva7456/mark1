import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Content.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const mockContent = [
  {
    week: 1,
    theme: "Introduction to your approach",
    posts: [
      { 
        type: "Carousel", 
        topic: "5 myths about fitness debunked", 
        audience: "Beginners & skeptics",
        cta: "Save this post for future reference",
        principle: "Authority & Social Proof",
        principleExplanation: "Using expert knowledge to debunk myths establishes authority, while referencing what others commonly believe leverages social proof.",
        visual: "Split-screen graphics comparing myths vs. facts with simple icons and bold text"
      },
      { 
        type: "Video", 
        topic: "Quick demo of your training style", 
        audience: "Potential clients considering personal training",
        cta: "DM me for a free consultation",
        principle: "Reciprocity",
        principleExplanation: "Offering valuable content for free creates a sense of reciprocity, making viewers more likely to respond to your CTA.",
        visual: "Fast-paced training montage showing your energy and training style in your actual workspace"
      },
      { 
        type: "Story", 
        topic: "Behind the scenes of your business", 
        audience: "All followers",
        cta: "Follow for more insights",
        principle: "Liking & Familiarity",
        principleExplanation: "Sharing personal aspects of your business creates likability and builds familiarity, which increases trust over time.",
        visual: "Candid photos or video clips of your workspace, training equipment, or planning process"
      }
    ]
  },
  {
    week: 2,
    theme: "Client success stories",
    posts: [
      { 
        type: "Transformation", 
        topic: "Before & after of a client", 
        audience: "Results-focused individuals",
        cta: "Book a consultation (link in bio)",
        principle: "Social Proof",
        principleExplanation: "Showing real results creates social proof, demonstrating that your methods work for others and can work for the viewer too.",
        visual: "Side-by-side comparison photos with consistent lighting and angles to highlight genuine progress"
      },
      { 
        type: "Testimonial", 
        topic: "Client interview about their journey", 
        audience: "People on the fence about committing",
        cta: "Comment if you relate to their story",
        principle: "Liking & Social Proof",
        principleExplanation: "Personal stories create emotional connections and relatability, while positive outcomes reinforce social proof.",
        visual: "Video interview with client in a comfortable setting with good lighting and clear audio"
      },
      { 
        type: "Carousel", 
        topic: "3 key habits that lead to success", 
        audience: "Committed fitness enthusiasts",
        cta: "Share this with someone who needs it",
        principle: "Commitment & Consistency",
        principleExplanation: "Highlighting successful habits encourages viewers to commit to small actions, which builds momentum through consistency.",
        visual: "Clean, minimalist graphics with icons representing each habit and short explanatory text"
      }
    ]
  },
  {
    week: 3,
    theme: "Education series",
    posts: [
      { 
        type: "Carousel", 
        topic: "The science behind your methods", 
        audience: "Data-driven, analytical followers",
        cta: "Save this to reference during workouts",
        principle: "Authority",
        principleExplanation: "Sharing research-backed information positions you as an expert and authority in your field, building credibility and trust.",
        visual: "Simple diagrams with scientific concepts visualized in an accessible way with your branding"
      },
      { 
        type: "Video", 
        topic: "Common form mistakes to avoid", 
        audience: "Intermediate fitness enthusiasts",
        cta: "Tag a friend who needs to see this",
        principle: "Loss Aversion",
        principleExplanation: "Highlighting mistakes taps into loss aversion - people's desire to avoid negative outcomes like injury or wasted effort.",
        visual: "Split-screen demonstrations showing incorrect form (with caution indicator) vs. correct form (with checkmark)"
      },
      { 
        type: "Reel", 
        topic: "Quick tips for better results", 
        audience: "Busy professionals with limited time",
        cta: "Try this in your next workout",
        principle: "Simplicity & Scarcity",
        principleExplanation: "Quick, actionable tips are perceived as valuable because they save time (scarcity) and are easy to implement (simplicity).",
        visual: "Fast-paced video with on-screen text highlighting key points and demonstrating quick techniques"
      }
    ]
  }
];

const WeekLoadingPlaceholder = ({ weekNumber, theme }) => (
  <div className={styles.weekSection}>
    <h2>Week {weekNumber}: {theme}</h2>
    <div className={styles.loadingSection}>
      <div className={styles.spinnerSmall}></div>
      <p>Generating content...</p>
    </div>
  </div>
);

export default function NewContent() {
  const router = useRouter();
  const { strategy } = router.query;
  const { user, loading } = useAuth();
  const [contentOutline, setContentOutline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  
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
    
    // Simulate API call with delay
    setTimeout(() => {
      // Use mock data directly
      setContentOutline(mockContent);
      setIsLoading(false);
    }, 1500);
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
                        
                        <div className={styles.postMeta}>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Audience:</span>
                            <span className={styles.metaValue}>{post.audience}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>CTA:</span>
                            <span className={styles.metaValue}>{post.cta}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Principle:</span>
                            <span className={styles.metaValue}>{post.principle}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Why it works:</span>
                            <span className={styles.metaValue}>{post.principleExplanation}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Proposed visual:</span>
                            <span className={styles.metaValue}>{post.visual}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className={styles.datePickerContainer}>
                <h3>When would you like to start publishing?</h3>
                <div className={styles.datePicker}>
                  <label htmlFor="start-date">Start Date:</label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate instanceof Date ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className={styles.dateInput}
                  />
                </div>
              </div>
              
              <div className={styles.actions}>
                <button onClick={handleSaveCalendar} className={styles.saveButton}>
                  Save Content Calendar
                </button>
                <button 
                  onClick={() => router.push(
                    `/calendar/view?strategy=${encodeURIComponent(strategy)}&startDate=${startDate.toISOString()}`
                  )} 
                  className={styles.calendarButton}
                >
                  Create Calendar View
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