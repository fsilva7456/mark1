import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Content.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

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
        visual: "Split-screen graphics comparing myths vs. facts with simple icons and bold text",
        proposedCaption: "Tired of fitness advice that doesn't work? 🤔 Let's bust some common myths! Swipe through to discover what REALLY works based on science, not trends. Save this post for the next time someone tells you one of these myths! #FitnessMyths #FactsNotFiction"
      },
      { 
        type: "Video", 
        topic: "Quick demo of your training style", 
        audience: "Potential clients considering personal training",
        cta: "DM me for a free consultation",
        principle: "Reciprocity",
        principleExplanation: "Offering valuable content for free creates a sense of reciprocity, making viewers more likely to respond to your CTA.",
        visual: "Fast-paced training montage showing your energy and training style in your actual workspace",
        proposedCaption: "This is how we train! 💪 A quick look at what a session with me looks like. Notice how we focus on proper form and sustainable intensity—this isn't about burning you out, it's about building you up! Curious if this approach would work for you? DM me for a free consultation to discuss your fitness goals. #PersonalTrainer #TrainingSession"
      },
      { 
        type: "Story", 
        topic: "Behind the scenes of your business", 
        audience: "All followers",
        cta: "Follow for more insights",
        principle: "Liking & Familiarity",
        principleExplanation: "Sharing personal aspects of your business creates likability and builds familiarity, which increases trust over time.",
        visual: "Candid photos or video clips of your workspace, training equipment, or planning process",
        proposedCaption: "Behind the scenes today! Setting up for a group session and thought I'd give you a peek at what goes into making your workouts effective. Every detail matters! Follow along for more behind-the-scenes content and fitness tips you can actually use. #BehindTheScenes #FitnessCoach"
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
        visual: "Side-by-side comparison photos with consistent lighting and angles to highlight genuine progress",
        proposedCaption: "Meet Sarah who came to me 6 months ago with a goal to gain strength and energy. The transformation goes beyond what you see in the photos—she's now sleeping better, has more energy throughout the day, and feels confident in her skin! This didn't happen overnight, but with consistent work and a sustainable approach. Want to start your journey? Book a consultation through the link in my bio. #TransformationTuesday #RealResults"
      },
      { 
        type: "Testimonial", 
        topic: "Client interview about their journey", 
        audience: "People on the fence about committing",
        cta: "Comment if you relate to their story",
        principle: "Liking & Social Proof",
        principleExplanation: "Personal stories create emotional connections and relatability, while positive outcomes reinforce social proof.",
        visual: "Video interview with client in a comfortable setting with good lighting and clear audio",
        proposedCaption: "\"I never thought I could stick with a fitness routine until I found this approach.\" Hear John's story about how he went from fitness-avoider to consistent gym-goer. What part of his journey resonates with you? Comment below if you've experienced similar challenges! #ClientStory #FitnessJourney"
      },
      { 
        type: "Carousel", 
        topic: "3 key habits that lead to success", 
        audience: "Committed fitness enthusiasts",
        cta: "Share this with someone who needs it",
        principle: "Commitment & Consistency",
        principleExplanation: "Highlighting successful habits encourages viewers to commit to small actions, which builds momentum through consistency.",
        visual: "Clean, minimalist graphics with icons representing each habit and short explanatory text",
        proposedCaption: "The difference between those who see results and those who don't often comes down to these 3 key habits. They're not complicated, but they require consistency! Swipe through to learn what my most successful clients all have in common. Know someone who needs this reminder? Tag them in the comments! #HealthyHabits #FitnessSuccess"
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
        visual: "Simple diagrams with scientific concepts visualized in an accessible way with your branding",
        proposedCaption: "Ever wonder WHY certain exercises are more effective than others? It's not magic—it's science! In this carousel, I break down the physiological principles behind the methods we use. Save this post to reference during your next workout. #ExerciseScience #EvidenceBased"
      },
      { 
        type: "Video", 
        topic: "Common form mistakes to avoid", 
        audience: "Intermediate fitness enthusiasts",
        cta: "Tag a friend who needs to see this",
        principle: "Loss Aversion",
        principleExplanation: "Highlighting mistakes taps into loss aversion - people's desire to avoid negative outcomes like injury or wasted effort.",
        visual: "Split-screen demonstrations showing incorrect form (with caution indicator) vs. correct form (with checkmark)",
        proposedCaption: "These form mistakes might be sabotaging your progress (and risking injury)! Watch for the correct technique demonstration so you can make every rep count. Know someone who might benefit from these tips? Tag them below so they can avoid these common pitfalls! #ProperForm #ExerciseTips"
      },
      { 
        type: "Reel", 
        topic: "Quick tips for better results", 
        audience: "Busy professionals with limited time",
        cta: "Try this in your next workout",
        principle: "Simplicity & Scarcity",
        principleExplanation: "Quick, actionable tips are perceived as valuable because they save time (scarcity) and are easy to implement (simplicity).",
        visual: "Fast-paced video with on-screen text highlighting key points and demonstrating quick techniques",
        proposedCaption: "No time? No problem! These 30-second tweaks can dramatically improve your workout efficiency. Even the busiest professionals can implement these tips. Try one in your next workout and let me know which one made the biggest difference for you! #QuickTips #EfficientWorkout"
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
  const [dailyEngagement, setDailyEngagement] = useState([]);
  const [isDailyEngagementLoading, setIsDailyEngagementLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    if (!router.isReady) return;
    
    const handleStrategy = async () => {
      setIsLoading(true);
      try {
        const strategyParam = router.query.strategy;
        console.log("Strategy parameter received:", strategyParam);
        
        if (!strategyParam) {
          setError('No strategy ID provided. Please select a strategy first.');
          setIsLoading(false);
          return;
        }
        
        // Check if the strategy param is a UUID
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidPattern.test(strategyParam);
        
        if (isUuid) {
          // We have a UUID, proceed normally
          console.log("Strategy ID is a valid UUID, fetching directly");
          fetchStrategyDetails(strategyParam);
        } else {
          // We have a name instead of ID, need to look up the ID
          console.log("Strategy parameter is not a valid UUID, looking up by name");
          
          // Look up the strategy ID by name
          const { data, error } = await supabase
            .from('strategies')
            .select('id')
            .eq('name', strategyParam)
            .single();
          
          if (error || !data) {
            console.error("Error finding strategy by name:", error);
            setError('Could not find strategy with this name. Please go back to the dashboard and try again.');
            setIsLoading(false);
            return;
          }
          
          console.log("Found strategy ID from name:", data.id);
          
          // Check if the retrieved ID is a valid UUID
          if (!uuidPattern.test(data.id)) {
            console.error("Retrieved ID is not a valid UUID:", data.id);
            setError('Invalid strategy ID format in database. Please contact support.');
            setIsLoading(false);
            return;
          }
          
          // Silently update the URL to use the UUID instead of the name
          router.replace(`/content/new?strategy=${encodeURIComponent(data.id)}`, undefined, { shallow: true });
          
          // Fetch strategy details with the correct ID
          fetchStrategyDetails(data.id);
        }
      } catch (err) {
        console.error("Error handling strategy parameter:", err);
        setError('Error processing strategy information: ' + err.message);
        setIsLoading(false);
      }
    };
    
    if (user) {
      handleStrategy();
    }
  }, [router.isReady, router.query, user, loading]);
  
  const fetchStrategyDetails = async (strategyId) => {
    try {
      console.log("Fetching strategy details for ID:", strategyId);
      
      // Check if ID is valid
      if (!strategyId) {
        console.error("No strategy ID provided");
        setError('No strategy ID provided.');
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) {
        console.error("Supabase query error:", error.message, error.details, error.hint);
        throw error;
      }
      
      if (data) {
        console.log("Strategy data loaded successfully:", data.id);
        setSelectedStrategy(data);
        // Generate content after strategy is loaded
        generateContent(data);
      } else {
        console.error("No strategy found with ID:", strategyId);
        setError('Strategy not found.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching strategy details:', err.message);
      setError('Failed to load strategy details: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
    }
  };
  
  const generateContent = async (strategyData) => {
    try {
      console.log("Generating content with strategy data using multi-stage approach...");
      
      // Validate that we have the required strategy data
      if (!strategyData || !strategyData.target_audience || !strategyData.objectives || !strategyData.key_messages) {
        console.error("Invalid strategy data format:", strategyData);
        setError('Invalid strategy data format. Missing required fields.');
        setIsLoading(false);
        return;
      }
      
      // Store all generated weeks here
      let generatedWeeks = [];
      
      // Step 1: Generate weekly themes
      console.log("Step 1: Generating weekly themes...");
      
      try {
        const themesResponse = await fetch('/api/content/multi-stage/generate-themes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            strategy: {
              name: strategyData.name,
              business_description: strategyData.business_description,
              target_audience: strategyData.target_audience,
              objectives: strategyData.objectives,
              key_messages: strategyData.key_messages
            }
          }),
        });
        
        if (!themesResponse.ok) {
          throw new Error(`Themes API error: ${themesResponse.status}`);
        }
        
        const themesData = await themesResponse.json();
        
        if (!themesData || !themesData.weeklyThemes) {
          throw new Error('Invalid themes response format');
        }
        
        console.log("Successfully generated themes:", themesData.weeklyThemes);
        
        // Step 2: Generate content for each week in parallel
        console.log("Step 2: Generating content for each week...");
        
        const weekPromises = themesData.weeklyThemes.map(async (weekTheme) => {
          try {
            console.log(`Generating content for Week ${weekTheme.week}: ${weekTheme.theme}`);
            
            const weekResponse = await fetch('/api/content/multi-stage/generate-week-content', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                strategy: {
                  name: strategyData.name,
                  business_description: strategyData.business_description,
                  target_audience: strategyData.target_audience,
                  objectives: strategyData.objectives,
                  key_messages: strategyData.key_messages
                },
                weekNumber: weekTheme.week,
                weekTheme: weekTheme.theme,
                allThemes: themesData.weeklyThemes
              }),
            });
            
            if (!weekResponse.ok) {
              throw new Error(`Week ${weekTheme.week} API error: ${weekResponse.status}`);
            }
            
            const weekData = await weekResponse.json();
            
            if (!weekData || !weekData.weekContent) {
              throw new Error(`Invalid week ${weekTheme.week} response format`);
            }
            
            console.log(`Successfully generated content for Week ${weekTheme.week}`);
            return weekData.weekContent;
          } catch (weekError) {
            console.error(`Error generating Week ${weekTheme.week} content:`, weekError);
            // Return fallback content for this week
            return {
              week: weekTheme.week,
              theme: weekTheme.theme,
              posts: [
                { 
                  type: "Carousel", 
                  topic: `${weekTheme.theme} overview`, 
                  audience: strategyData.target_audience[0] || "Fitness enthusiasts",
                  cta: "Save this post",
                  principle: "Authority",
                  principleExplanation: "Expert information establishes trust.",
                  visual: "Information slides",
                  proposedCaption: `Week ${weekTheme.week} of your fitness journey focuses on ${weekTheme.theme}. Save this post for reference! #FitnessJourney #HealthTips`
                },
                { 
                  type: "Video", 
                  topic: `${weekTheme.theme} demonstration`, 
                  audience: strategyData.target_audience[1] || "Active individuals",
                  cta: "Try this technique",
                  principle: "Social Proof",
                  principleExplanation: "Showing results builds credibility.",
                  visual: "Demonstration video",
                  proposedCaption: `See how to implement ${weekTheme.theme} in your fitness routine. Let me know if you try it! #FitnessTips #WorkoutWednesday`
                },
                { 
                  type: "Image", 
                  topic: `${weekTheme.theme} motivation`, 
                  audience: strategyData.target_audience[2] || "Fitness beginners",
                  cta: "Comment your experience",
                  principle: "Reciprocity",
                  principleExplanation: "Sharing valuable content creates goodwill.",
                  visual: "Motivational image",
                  proposedCaption: `Finding motivation for ${weekTheme.theme} can be challenging. Share your experience in the comments! #FitnessMotivation #FitnessJourney`
                }
              ]
            };
          }
        });
        
        // Wait for all weeks to complete - either successfully or with fallbacks
        generatedWeeks = await Promise.all(weekPromises);
        
        // Ensure weeks are in correct order
        generatedWeeks.sort((a, b) => a.week - b.week);
        
        console.log("All weeks generated successfully:", generatedWeeks.length);
        setContentOutline(generatedWeeks);
      } catch (themesError) {
        console.error('Themes generation failed:', themesError);
        
        // Fall back to customized mock content if the themes API fails
        console.warn("Using fallback customized mock content due to themes API error");
        const customizedMockContent = createCustomizedMockContent(strategyData);
        setContentOutline(customizedMockContent);
      }
      
      // Set empty daily engagement data (daily engagement API is disabled for now)
      setDailyEngagement([]);
      setIsDailyEngagementLoading(false);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in multi-stage content generation:', error);
      setContentOutline(mockContent);
      setIsLoading(false);
    }
  };
  
  // Helper function to create mock content that uses the strategy elements
  const createCustomizedMockContent = (strategyData) => {
    // Create a deep copy of mock content
    const customContent = JSON.parse(JSON.stringify(mockContent));
    
    // Customize week themes based on key messages
    if (strategyData.key_messages && strategyData.key_messages.length >= 3) {
      customContent[0].theme = `Introducing: ${strategyData.key_messages[0]}`;
      customContent[1].theme = `Focusing on: ${strategyData.key_messages[1]}`;
      customContent[2].theme = `Highlighting: ${strategyData.key_messages[2]}`;
    }
    
    // Customize audience targeting
    if (strategyData.target_audience && strategyData.target_audience.length > 0) {
      // Distribute target audiences across the posts
      let audienceIndex = 0;
      customContent.forEach(week => {
        week.posts.forEach(post => {
          post.audience = strategyData.target_audience[audienceIndex % strategyData.target_audience.length];
          audienceIndex++;
        });
      });
    }
    
    // Use the business description in at least one post
    if (strategyData.business_description) {
      const shortDesc = strategyData.business_description.length > 50 
        ? strategyData.business_description.substring(0, 50) + "..." 
        : strategyData.business_description;
        
      customContent[0].posts[0].topic = `How ${shortDesc} can transform your fitness journey`;
      
      // Customize caption with business description
      customContent[0].posts[0].proposedCaption = `Discover how ${shortDesc} can completely transform your fitness journey! Swipe to learn more about our unique approach and why it works. Save this post for reference! #FitnessJourney #TransformYourLife`;
    }
    
    // Use objectives in some posts
    if (strategyData.objectives && strategyData.objectives.length > 0) {
      // Use objective in the second week's first post
      if (customContent[1].posts[0]) {
        customContent[1].posts[0].topic = strategyData.objectives[0];
        
        // Add caption that incorporates this objective
        customContent[1].posts[0].proposedCaption = `Our focus on "${strategyData.objectives[0]}" has helped clients achieve amazing results. Swipe to see the transformation! Want to experience similar results? Book a consultation through the link in my bio. #FitnessGoals #RealResults`;
      }
      
      // Use another objective if available
      if (strategyData.objectives.length > 1 && customContent[2].posts[0]) {
        customContent[2].posts[0].proposedCaption = `Let me show you the science behind how we achieve "${strategyData.objectives[1]}" with our clients. These principles are what make our approach so effective! Save this post to reference during your next workout. #FitnessFacts #EvidenceBased`;
      }
    }
    
    // Ensure all posts have captions
    customContent.forEach(week => {
      week.posts.forEach(post => {
        if (!post.proposedCaption) {
          post.proposedCaption = `Check out this ${post.type} about ${post.topic}! Designed specifically for ${post.audience}. ${post.cta} #Fitness #HealthyLifestyle`;
        }
      });
    });
    
    return customContent;
  };
  
  const handleSaveCalendar = async () => {
    try {
      // Create a new calendar in Supabase
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendars')
        .insert([
          { 
            user_id: user.id,
            name: `Content Calendar for ${selectedStrategy?.name || 'Strategy'}`,
            progress: 0,
            posts_scheduled: contentOutline.reduce((total, week) => total + week.posts.length, 0),
            posts_published: 0
          }
        ])
        .select();
      
      if (calendarError) throw calendarError;
      
      const calendarId = calendarData[0].id;
      
      // Link the content plan to the calendar
      const { data: contentPlanData, error: contentPlanError } = await supabase
        .from('content_plans')
        .insert([
          { 
            user_id: user.id,
            name: `Content Plan for ${selectedStrategy?.name || 'Marketing Strategy'}`,
            strategy_id: selectedStrategy.id,
            calendar_id: calendarId,
            campaigns: contentOutline,
            daily_engagement: dailyEngagement
          }
        ])
        .select();
      
      if (contentPlanError) throw contentPlanError;
      
      // Generate initial posts from content outline
      const postsList = [];
      const startingDate = new Date(startDate);
      
      contentOutline.forEach((week, weekIndex) => {
        week.posts.forEach((post, postIndex) => {
          // Set date for this post (each post is 1-2 days apart)
          const postDate = new Date(startingDate);
          postDate.setDate(postDate.getDate() + (weekIndex * 7) + postIndex);
          
          postsList.push({
            calendar_id: calendarId,
            title: post.topic,
            content: post.topic,
            post_type: post.type,
            target_audience: post.audience,
            scheduled_date: postDate.toISOString(),
            status: 'scheduled',
            engagement: {
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              clicks: 0
            }
          });
        });
      });
      
      // Add posts to the database
      if (postsList.length > 0) {
        const { error: postsError } = await supabase
          .from('calendar_posts')
          .insert(postsList);
        
        if (postsError) throw postsError;
      }
      
      toast.success('Calendar created successfully!');
      
      // Temporarily redirect to dashboard instead of calendar page
      router.push('/dashboard?success=calendar-created');
      
      // To debug, log the calendar ID
      console.log("Created calendar with ID:", calendarId);
    } catch (error) {
      console.error('Error saving calendar:', error);
      toast.error('Failed to create calendar. Please try again.');
    }
  };

  const handleSaveContent = async () => {
    try {
      toast.loading("Saving content plan...");
      
      if (!selectedStrategy || !selectedStrategy.id) {
        toast.error("No strategy selected");
        return;
      }
      
      // Create a new content plan in the database
      const { data: contentPlanData, error: contentPlanError } = await supabase
        .from('content_plans')
        .insert([
          {
            name: `Content Plan for ${selectedStrategy.name}`,
            user_id: user.id,
            strategy_id: selectedStrategy.id,
            campaigns: contentOutline.map(week => ({
              week: week.week,
              theme: week.theme,
              posts: week.posts.map(post => ({
                type: post.type,
                topic: post.topic,
                audience: post.audience,
                cta: post.cta,
                principle: post.principle,
                principle_explanation: post.principleExplanation,
                visual: post.visual,
                proposed_caption: post.proposedCaption
              }))
            })),
            daily_engagement: dailyEngagement
          }
        ])
        .select();
      
      if (contentPlanError) {
        throw contentPlanError;
      }
      
      toast.dismiss();
      toast.success("Content plan saved successfully!");
      
      // Navigate to the content plan view page
      router.push(`/content-plans/${contentPlanData[0].id}`);
    } catch (error) {
      toast.dismiss();
      console.error("Error saving content plan:", error);
      toast.error("Failed to save content plan");
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
            <h1>Content Outline for {selectedStrategy?.name || 'Strategy'}</h1>
            <p>Here's a 3-week content plan based on your marketing strategy.</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Generating your content outline...</p>
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
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Proposed caption:</span>
                            <span className={styles.metaValue}>{post.proposedCaption || "No caption proposed for this content."}</span>
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
                  onClick={handleSaveContent}
                  className={styles.calendarButton}
                >
                  Save Content Plan
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

      {process.env.NODE_ENV === 'development' && (
        <div className={styles.diagnosticTools} style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '15px',
          backgroundColor: '#f0f8ff',
          border: '2px solid #3454D1',
          borderRadius: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1A2B3C' }}>Development Tools</h3>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/content/test-gemini');
                const data = await response.json();
                console.log("Gemini API Test Result:", data);
                alert(data.success ? "API Test Successful: " + data.response : "API Test Failed: " + data.error);
              } catch (e) {
                console.error("Test failed:", e);
                alert("API Test Error: " + e.message);
              }
            }}
            style={{
              padding: '10px 15px',
              backgroundColor: '#3454D1',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Test Gemini API
          </button>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/content/simple-test');
                const data = await response.json();
                console.log("Simple Test Result:", data);
                alert("Simple API Test: " + JSON.stringify(data, null, 2));
              } catch (e) {
                console.error("Simple test failed:", e);
                alert("Simple API Test Error: " + e.message);
              }
            }}
            style={{
              padding: '10px 15px',
              backgroundColor: '#ff7700',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Simple API Test
          </button>
        </div>
      )}
    </div>
  );
} 