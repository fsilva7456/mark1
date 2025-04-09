import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/Content.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { RefreshIcon } from '@heroicons/react/24/outline';
import { BsCalendarEvent } from 'react-icons/bs';
import { useProject } from '../../contexts/ProjectContext';

const mockContent = [
  {
    week: 1,
    theme: "Introduction to your approach",
    posts: [
      { 
        type: "Carousel", 
        topic: "The 5 most damaging fitness myths debunked with scientific evidence and practical alternatives", 
        audience: "Beginners and skeptics who have been discouraged by previous fitness attempts. They're wary of industry claims and need solid evidence before committing to a new approach. Their past experiences have created doubt about what actually works.",
        cta: "Save this myth-busting guide and reference it whenever you hear these common misconceptions",
        principle: "Authority & Social Proof",
        principleExplanation: "Using expert knowledge to debunk myths establishes authority, while referencing what others commonly believe leverages social proof.",
        visual: "Split-screen graphics comparing myths vs. facts with simple icons and bold text explanations",
        proposedCaption: "Tired of fitness advice that doesn't work? 🤔 Let's bust some common myths! Swipe through to discover what REALLY works based on science, not trends. Save this post for the next time someone tells you one of these myths! #FitnessMyths #FactsNotFiction"
      },
      { 
        type: "Video", 
        topic: "Behind-the-scenes demonstration of my unique training approach and philosophy in action with real clients", 
        audience: "Potential clients considering personal training who want to see your authentic training style before committing. They're comparing different trainers and need to understand your specific approach and expertise that sets you apart.",
        cta: "Send me a direct message today to schedule your complimentary consultation session",
        principle: "Reciprocity",
        principleExplanation: "Offering valuable content for free creates a sense of reciprocity, making viewers more likely to respond to your CTA.",
        visual: "Fast-paced dynamic training montage showing diverse client interactions and personalized coaching moments",
        proposedCaption: "This is how we train! 💪 A quick look at what a session with me looks like. Notice how we focus on proper form and sustainable intensity—this isn't about burning you out, it's about building you up! Curious if this approach would work for you? DM me for a free consultation to discuss your fitness goals. #PersonalTrainer #TrainingSession"
      },
      { 
        type: "Story", 
        topic: "Exclusive behind-the-scenes tour of the thoughtful preparation process that makes your fitness experience exceptional", 
        audience: "All followers who appreciate transparency and are curious about your professional standards and attention to detail. They want to feel connected to your business on a personal level and understand the care that goes into their experience.",
        cta: "Follow our account for more regular behind-the-scenes insights into our proven fitness methods",
        principle: "Liking & Familiarity",
        principleExplanation: "Sharing personal aspects of your business creates likability and builds familiarity, which increases trust over time.",
        visual: "Candid photos and timelapse clips showing thoughtful preparation and equipment arrangement process",
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
        topic: "Remarkable 6-month transformation journey showcasing sustainable methods and holistic well-being improvements", 
        audience: "Results-focused individuals who are skeptical about fitness transformations but desperately want to achieve their own. They're tired of false promises and want proof that your methods deliver sustainable, realistic results for ordinary people.",
        cta: "Book your personalized consultation through the link in my bio to begin your transformation today",
        principle: "Social Proof",
        principleExplanation: "Showing real results creates social proof, demonstrating that your methods work for others and can work for the viewer too.",
        visual: "Side-by-side comparison photos with consistent lighting and measurement tracking charts showing progressive improvements",
        proposedCaption: "Meet Sarah who came to me 6 months ago with a goal to gain strength and energy. The transformation goes beyond what you see in the photos—she's now sleeping better, has more energy throughout the day, and feels confident in her skin! This didn't happen overnight, but with consistent work and a sustainable approach. Want to start your journey? Book a consultation through the link in my bio. #TransformationTuesday #RealResults"
      },
      { 
        type: "Testimonial", 
        topic: "Heartfelt client interview revealing the emotional and physical breakthroughs that changed their relationship with fitness", 
        audience: "People on the fence about committing who need emotional reassurance more than logical arguments. They identify with the struggles shown and need to see someone like them overcome similar obstacles to believe it's possible for themselves.",
        cta: "Comment below with which part of this journey resonates most with your personal experience",
        principle: "Liking & Social Proof",
        principleExplanation: "Personal stories create emotional connections and relatability, while positive outcomes reinforce social proof.",
        visual: "Intimate interview setting with soft lighting, authentic reactions, and supportive body language",
        proposedCaption: "\"I never thought I could stick with a fitness routine until I found this approach.\" Hear John's story about how he went from fitness-avoider to consistent gym-goer. What part of his journey resonates with you? Comment below if you've experienced similar challenges! #ClientStory #FitnessJourney"
      },
      { 
        type: "Carousel", 
        topic: "The 3 non-negotiable daily habits that separate successful clients from those who struggle to see results", 
        audience: "Committed fitness enthusiasts who are already exercising regularly but not seeing the results they expect. They're disciplined and dedicated but need to understand the subtle habit adjustments that create breakthrough progress.",
        cta: "Share these game-changing habits with a friend who needs this information to transform their results",
        principle: "Commitment & Consistency",
        principleExplanation: "Highlighting successful habits encourages viewers to commit to small actions, which builds momentum through consistency.",
        visual: "Clean, minimalist graphics with powerful habit illustrations and before/after outcome comparisons",
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
        topic: "The scientific principles behind our training methodology that explain why conventional approaches often fail", 
        audience: "Data-driven, analytical followers who need to understand the 'why' behind your methods. They have technical knowledge and appreciate evidence-based information that validates your approach compared to alternatives they've tried.",
        cta: "Save this comprehensive reference guide to review during your workouts for optimal technique application",
        principle: "Authority",
        principleExplanation: "Sharing research-backed information positions you as an expert and authority in your field, building credibility and trust.",
        visual: "Simple scientific diagrams with annotated exercise illustrations and physiological effect explanations",
        proposedCaption: "Ever wonder WHY certain exercises are more effective than others? It's not magic—it's science! In this carousel, I break down the physiological principles behind the methods we use. Save this post to reference during your next workout. #ExerciseScience #EvidenceBased"
      },
      { 
        type: "Video", 
        topic: "The 5 most dangerous form mistakes that can sabotage your progress and lead to preventable injuries", 
        audience: "Intermediate fitness enthusiasts who have experience but may have developed bad habits over time. They're performing exercises regularly but experiencing plateaus or minor pain that signals technique issues requiring correction.",
        cta: "Tag a workout partner who needs to see these critical form corrections to improve safely",
        principle: "Loss Aversion",
        principleExplanation: "Highlighting mistakes taps into loss aversion - people's desire to avoid negative outcomes like injury or wasted effort.",
        visual: "Split-screen demonstrations highlighting incorrect form with red indicators versus correct technique with green checkmarks",
        proposedCaption: "These form mistakes might be sabotaging your progress (and risking injury)! Watch for the correct technique demonstration so you can make every rep count. Know someone who might benefit from these tips? Tag them below so they can avoid these common pitfalls! #ProperForm #ExerciseTips"
      },
      { 
        type: "Reel", 
        topic: "3 time-saving workout modifications that deliver maximum results for busy professionals with limited schedules", 
        audience: "Busy professionals with demanding careers who struggle to maintain consistency due to time constraints. They're motivated but pragmatic, prioritizing efficiency and measurable outcomes that fit their compressed availability.",
        cta: "Try implementing these time-efficient techniques in your next workout and report your experience",
        principle: "Simplicity & Scarcity",
        principleExplanation: "Quick, actionable tips are perceived as valuable because they save time (scarcity) and are easy to implement (simplicity).",
        visual: "Fast-paced demonstration with on-screen time savings and efficiency metrics highlighting benefits",
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
  // --- Log router query on initial render --- 
  console.log("NewContent component rendered. router.query:", JSON.stringify(router.query));
  // --- End Log ---

  const { strategyId } = router.query;
  const { user, loading } = useAuth();
  const { currentProject } = useProject();
  const [contentOutline, setContentOutline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [dailyEngagement, setDailyEngagement] = useState([]);
  const [isDailyEngagementLoading, setIsDailyEngagementLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [error, setError] = useState('');
  // Add states for individual week loading
  const [weekLoadingStates, setWeekLoadingStates] = useState({
    1: { loading: false, error: null },
    2: { loading: false, error: null },
    3: { loading: false, error: null }
  });
  // Track theme loading separately
  const [themesLoading, setThemesLoading] = useState(false);
  const [themes, setThemes] = useState(null);
  
  // Add new state variables for feedback modal
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackWeek, setFeedbackWeek] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  
  // When component mounts, check URL params and localStorage for strategy ID
  useEffect(() => {
    console.log("Running effect. router.isReady:", router.isReady, "router.query.strategyId:", router.query.strategyId);
    if (!router.isReady) {
        console.log("Router not ready, skipping effect run.");
        return; 
    }
    
    // Check for user authentication
    if (!loading && !user) {
      toast.error('Please login to continue');
      router.push('/marketing-plan');
      return;
    }
    
    if (!router.isReady) return;
    
    const initializePage = async () => {
      try {
        setIsLoading(true);
        let strategyIdSource = 'None';
        
        let currentStrategyId = router.query.strategyId;
        if (currentStrategyId) {
            strategyIdSource = 'URL Query';
        }
        
        console.log(`Strategy ID obtained from: ${strategyIdSource}, Value: ${currentStrategyId}`);
        
        if (!currentStrategyId) {
          // If no ID in URL after router is ready, it's an error
          console.error("No strategyId found in URL query parameter.")
          setError('No strategy ID provided in URL. Please navigate from the dashboard.');
          setIsLoading(false);
          return;
        }
        
        // --- Clear potentially stale localStorage items --- 
        localStorage.removeItem('lastStrategyId');
        localStorage.removeItem('lastContentOutline');
        console.log("Cleared stale localStorage items.");
        // --- END CLEAR --- 
        
        // Fetch strategy data
        console.log(`Fetching strategy data for ID: ${currentStrategyId}`); // Log ID being fetched
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', currentStrategyId)
          .single();
        
        if (strategyError) throw strategyError;
        
        if (!strategyData) {
          setError('Strategy not found');
          setIsLoading(false);
          return;
        }
        
        console.log(`Fetched Strategy Data - ID: ${strategyData.id}, Name: ${strategyData.name}`);
        setSelectedStrategy(strategyData);
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Shorter delay
        
        // Check if outline exists in DB
        console.log(`Checking DB for existing outline for strategy: ${currentStrategyId}`);
        const { data: existingContent, error: contentError } = await supabase
          .from('content_outlines')
          .select('*')
          .eq('strategy_id', currentStrategyId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (contentError) throw contentError;
        
        if (existingContent && existingContent.length > 0) {
          console.log("Found existing content outline in DB for strategy:", currentStrategyId);
          setContentOutline(existingContent[0].outline || []);
        } else {
          console.log(`No existing DB outline. Calling generateContent with Strategy - ID: ${strategyData.id}, Name: ${strategyData.name}`);
          await generateContent(strategyData);
        }
        
      } catch (error) {
        console.error('Error initializing page:', error);
        setError(`Failed to load strategy: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializePage();
  }, [router.isReady, router.query.strategyId, user, loading]);
  
  // --- NEW useEffect to log contentOutline changes --- 
  useEffect(() => {
      console.log("contentOutline state updated:", JSON.stringify(contentOutline, null, 2));
      // Optional: Log just the themes/topics to easily compare with mock data
      if(contentOutline && contentOutline.length > 0) {
          console.log("Current Outline Themes:", contentOutline.map(w => w.theme));
          console.log("Current Outline Week 1 Topics:", contentOutline[0]?.posts?.map(p => p.topic));
      }
  }, [contentOutline]);
  // --- END NEW useEffect --- 
  
  // Add the missing generateWeeklyThemes function
  const generateWeeklyThemes = async () => {
    try {
      console.log("Generating weekly themes for strategy:", selectedStrategy?.id);
      setThemesLoading(true);
      
      // Initialize an empty content outline with placeholder weeks
      setContentOutline([
        { week: 1, theme: "Loading...", posts: [], loading: true },
        { week: 2, theme: "Loading...", posts: [], loading: true },
        { week: 3, theme: "Loading...", posts: [], loading: true }
      ]);
      
      if (!selectedStrategy) {
        // Try to use the localStorage strategy ID as a backup
        const fallbackStrategyId = localStorage.getItem('lastStrategyId');
        if (fallbackStrategyId) {
          // Fetch strategy data
          const { data: strategyData, error: strategyError } = await supabase
            .from('strategies')
            .select('*')
            .eq('id', fallbackStrategyId)
            .single();
          
          if (!strategyError && strategyData) {
            setSelectedStrategy(strategyData);
            await generateContent(strategyData);
            return;
          }
        }
        
        throw new Error("No strategy selected. Please select a strategy first.");
      }
      
      // Call the generateContent function which contains the actual theme generation logic
      await generateContent(selectedStrategy);
      
    } catch (error) {
      console.error("Error generating weekly themes:", error);
      setError(error.message || "Failed to generate content themes");
      setThemesLoading(false);
      
      // Reset content outline if error
      setContentOutline([]);
    }
  };
  
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
      setError('');
      setIsLoading(true); // Ensure main loading state is true
      setThemesLoading(true); // Themes are loading first
      setWeekLoadingStates({ /* Reset week states */ });

      // --- MODIFICATION: Start with empty outline --- 
      setContentOutline([]); 
      // --- END MODIFICATION ---

      const aesthetic = router.query.aesthetic || '';
      console.log("Aesthetic from URL:", aesthetic);
      
      // Validate that we have the required strategy data
      if (!strategyData || !strategyData.target_audience || !strategyData.objectives || !strategyData.key_messages) {
        console.error("Invalid strategy data format:", strategyData);
        setError('Invalid strategy data format. Missing required fields.');
        setIsLoading(false);
        return;
      }
      
      let generatedWeeks = [];

      // Step 1: Generate weekly themes
      console.log("Step 1: Generating weekly themes...");
      // ... (retry logic for themes API call) ...
      
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
            key_messages: strategyData.key_messages,
            // Include enhanced strategy data if available
            enhancedStrategy: strategyData.enhancedStrategy || null
          },
          aesthetic: aesthetic
        }),
      });
      
      if (!themesResponse.ok) {
        const errorData = await themesResponse.json();
        const errorText = errorData.error || `Status code: ${themesResponse.status}`;
        console.error("Themes API error:", errorData);
        
        // Add more detailed logging of the error response
        console.error("Theme generation failed with details:", {
          status: themesResponse.status,
          statusText: themesResponse.statusText,
          error: errorData.error,
          details: errorData.details || 'No additional details',
          errorSource: errorData.errorSource || 'Unknown source'
        });
        
        throw new Error(`Failed to generate themes: ${errorText}\n${errorData.details || ''}`);
      }
      
      const themesData = await themesResponse.json();
      
      // ... (handle themes response errors) ...
      
      console.log("Successfully generated themes:", themesData.weeklyThemes);
      setThemes(themesData.weeklyThemes);

      // --- MODIFICATION: Initialize outline AFTER themes are fetched --- 
      const initialOutline = themesData.weeklyThemes.map(theme => ({
          week: theme.week,
          theme: theme.theme,
          objective: theme.objective,
          targetSegment: theme.targetSegment || "",
          phase: theme.phase || "",
          posts: [],
          loading: true, // Mark as loading initially for week content
          error: null
      }));
      setContentOutline(initialOutline);
      // --- END MODIFICATION ---

      setThemesLoading(false);

      // Step 2: Generate content for each week
      console.log("Step 2: Generating content for each week sequentially...");
      
      for (const weekTheme of themesData.weeklyThemes) {
        // Update loading state for this specific week (using the separate state)
        setWeekLoadingStates(prev => ({ ...prev, [weekTheme.week]: { loading: true, error: null } }));
        
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
              weekObjective: weekTheme.objective,
              allThemes: themesData.weeklyThemes,
              aesthetic: aesthetic
            }),
          });
          
          if (!weekResponse.ok) {
            const errorData = await weekResponse.json();
            const errorText = errorData.error || `Status code: ${weekResponse.status}`;
            console.error(`Week ${weekTheme.week} API error:`, errorData);
            throw new Error(`Week ${weekTheme.week} API error: ${errorText}`);
          }
          
          const weekData = await weekResponse.json();
          
          if (!weekData || !weekData.weekContent) {
            throw new Error(`Invalid week ${weekTheme.week} response format`);
          }
          
          console.log(`Successfully generated content for Week ${weekTheme.week}`);
          generatedWeeks.push(weekData.weekContent);

          // --- MODIFICATION: Update state using functional update --- 
          setContentOutline(prevOutline => {
            const updatedOutline = [...prevOutline];
            const index = updatedOutline.findIndex(w => w.week === weekTheme.week);
            if (index !== -1) {
              updatedOutline[index] = {
                ...weekData.weekContent, // Contains week, theme, posts
                loading: false, // Mark as loaded
                objective: weekTheme.objective, // Ensure objective is kept
                targetSegment: weekTheme.targetSegment || updatedOutline[index].targetSegment || "", // Ensure segment is kept
                phase: weekTheme.phase || updatedOutline[index].phase || "" // Ensure phase is kept
              };
            }
            return updatedOutline;
          });
          // --- END MODIFICATION ---

          setWeekLoadingStates(prev => ({ ...prev, [weekTheme.week]: { loading: false, error: null } }));
        } catch (weekError) {
          console.error(`Error generating Week ${weekTheme.week} content:`, weekError);
          setWeekLoadingStates(prev => ({ ...prev, [weekTheme.week]: { loading: false, error: weekError.message } }));
          
          // --- MODIFICATION: Update state using functional update for error --- 
          setContentOutline(prevOutline => {
            const updatedOutline = [...prevOutline];
            const index = updatedOutline.findIndex(w => w.week === weekTheme.week);
            if (index !== -1) {
              updatedOutline[index] = {
                ...updatedOutline[index], // Keep existing theme, objective etc.
                loading: false,
                error: weekError.message,
                posts: [] // Clear posts on error
              };
            }
            return updatedOutline;
          });
          // --- END MODIFICATION ---
        }
      }
      
      console.log("All weeks generation attempts complete.");
      // setIsLoading(false); // Removed: Main loading state should be false once themes are loaded
    } catch (error) {
      console.error('Error in multi-stage content generation:', error);
      setError(`Content generation failed: ${error.message}. Please try again later.`);
      setContentOutline([]); // Clear outline on major error
      setThemesLoading(false);
    } finally {
      // Ensure main loading indicator stops after themes are loaded or if there's an error
      // Individual weeks handle their own loading indicators via weekLoadingStates
      setIsLoading(false); 
    }
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
      router.push('/marketing-plan?success=calendar-created');
      
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
      
      if (!currentProject) {
        toast.error("No project selected");
        return;
      }
      
      // Create a new content plan in the database
      const { data: contentPlanData, error: contentPlanError } = await supabase
        .from('content_outlines')
        .insert([
          {
            user_id: user.id,
            project_id: currentProject.id,
            strategy_id: selectedStrategy.id,
            outline: contentOutline.map(week => ({
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
              })),
              objective: week.objective
            })),
          }
        ])
        .select();
      
      if (contentPlanError) {
        throw contentPlanError;
      }
      
      toast.dismiss();
      toast.success("Content outline saved successfully!");
      
      // Navigate to the content calendar creation page
      router.push(`/content/calendar-params?strategyId=${selectedStrategy.id}&contentOutline=${encodeURIComponent(JSON.stringify(contentPlanData[0].outline))}`);
    } catch (error) {
      toast.dismiss();
      console.error("Error saving content outline:", error);
      toast.error("Failed to save content outline");
    }
  };

  const handleRetryWeek = async (weekNumber) => {
    if (!contentOutline.some(week => week.week === weekNumber && week.loading)) {
      setError("No content to retry for this week.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const weekToRetry = contentOutline.find(week => week.week === weekNumber);
      if (!weekToRetry) {
        throw new Error("Week not found in content outline.");
      }

      const aesthetic = router.query.aesthetic || '';

      const weekResponse = await fetch('/api/content/multi-stage/generate-week-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: {
            name: selectedStrategy.name,
            business_description: selectedStrategy.business_description,
            target_audience: selectedStrategy.target_audience,
            objectives: selectedStrategy.objectives,
            key_messages: selectedStrategy.key_messages
          },
          weekNumber: weekNumber,
          weekTheme: weekToRetry.theme,
          weekObjective: weekToRetry.objective,
          allThemes: contentOutline,
          aesthetic: aesthetic
        }),
      });

      if (!weekResponse.ok) {
        const errorData = await weekResponse.json();
        throw new Error(errorData.error || `Status code: ${weekResponse.status}`);
      }

      const weekData = await weekResponse.json();

      if (!weekData || !weekData.weekContent) {
        throw new Error('Invalid week response format');
      }

      console.log(`Successfully regenerated content for Week ${weekNumber}`);

      setContentOutline(prev => {
        const updated = [...prev];
        const index = updated.findIndex(w => w.week === weekNumber);
        if (index !== -1) {
          updated[index] = {
            ...weekData.weekContent,
            loading: false,
            objective: weekToRetry.objective,
            targetSegment: weekToRetry.targetSegment || "",
            phase: weekToRetry.phase || ""
          };
        }
        return updated;
      });

      toast.success(`Week ${weekNumber} content regenerated successfully!`);
    } catch (error) {
      console.error(`Error retrying Week ${weekNumber}:`, error);
      setError(`Failed to regenerate content for Week ${weekNumber}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open the feedback modal for a specific week
  const handleOpenFeedbackModal = (weekNumber) => {
    const week = contentOutline.find(w => w.week === weekNumber);
    if (!week) {
      setError("Week not found in content outline.");
      return;
    }
    
    setFeedbackWeek(weekNumber);
    setFeedbackText('');
    setIsFeedbackModalOpen(true);
  };
  
  // Function to close the feedback modal
  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setFeedbackWeek(null);
    setFeedbackText('');
  };
  
  // Function to regenerate content with user feedback
  const handleRegenerateWithFeedback = async () => {
    if (!feedbackWeek || !feedbackText.trim()) {
      return;
    }
    
    setIsFeedbackModalOpen(false);
    setIsLoading(true);
    setError('');
    
    // Update loading state for this specific week
    setWeekLoadingStates(prev => ({
      ...prev,
      [feedbackWeek]: { loading: true, error: null }
    }));
    
    try {
      const weekToRegenerate = contentOutline.find(week => week.week === feedbackWeek);
      if (!weekToRegenerate) {
        throw new Error("Week not found in content outline.");
      }
      
      const aesthetic = router.query.aesthetic || '';
      
      // Make API call to regenerate content with feedback
      const weekResponse = await fetch('/api/content/multi-stage/generate-week-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: {
            name: selectedStrategy.name,
            business_description: selectedStrategy.business_description,
            target_audience: selectedStrategy.target_audience,
            objectives: selectedStrategy.objectives,
            key_messages: selectedStrategy.key_messages
          },
          weekNumber: feedbackWeek,
          weekTheme: weekToRegenerate.theme,
          weekObjective: weekToRegenerate.objective,
          allThemes: contentOutline,
          aesthetic: aesthetic,
          feedback: feedbackText // Include user feedback
        }),
      });
      
      if (!weekResponse.ok) {
        const errorData = await weekResponse.json();
        throw new Error(errorData.error || `Status code: ${weekResponse.status}`);
      }
      
      const weekData = await weekResponse.json();
      
      if (!weekData || !weekData.weekContent) {
        throw new Error('Invalid week response format');
      }
      
      console.log(`Successfully regenerated content for Week ${feedbackWeek} with feedback`);
      
      // Update the content outline with new content
      setContentOutline(prev => {
        const updated = [...prev];
        const index = updated.findIndex(w => w.week === feedbackWeek);
        if (index !== -1) {
          updated[index] = {
            ...weekData.weekContent,
            loading: false,
            objective: weekToRegenerate.objective,
            targetSegment: weekToRegenerate.targetSegment || "",
            phase: weekToRegenerate.phase || ""
          };
        }
        return updated;
      });
      
      // Update loading state
      setWeekLoadingStates(prev => ({
        ...prev,
        [feedbackWeek]: { loading: false, error: null }
      }));
      
      toast.success(`Week ${feedbackWeek} content regenerated with your feedback!`);
      
      // Reset feedback state
      setFeedbackWeek(null);
      setFeedbackText('');
      
    } catch (error) {
      console.error(`Error regenerating Week ${feedbackWeek} with feedback:`, error);
      
      // Update error state
      setWeekLoadingStates(prev => ({
        ...prev,
        [feedbackWeek]: { loading: false, error: error.message }
      }));
      
      setError(`Failed to regenerate content with feedback: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to generate explanations based on the objective
  function getObjectiveExplanation(objective, theme) {
    if (!objective) return '';
    
    // Extract the action verb from the objective
    const firstWord = objective.split(' ')[0].toLowerCase();
    
    // Create explanations based on the action verb
    switch (firstWord) {
      case 'book':
      case 'schedule':
      case 'register':
        return 'Direct conversion actions like this create immediate business value and allow you to capture leads when audience interest is at its peak.';
      
      case 'download':
      case 'save':
        return 'This objective builds your email list and creates a valuable touchpoint for future marketing while providing immediate value to your audience.';
      
      case 'share':
      case 'tag':
        return 'Social sharing amplifies your reach through trusted recommendations, effectively growing your audience through word-of-mouth at zero cost.';
      
      case 'follow':
      case 'subscribe':
        return 'Building your owned audience creates long-term marketing assets and reduces dependency on paid channels for future campaigns.';
      
      case 'try':
      case 'implement':
      case 'start':
        return 'Getting customers to take initial action builds momentum in their fitness journey and increases the likelihood of deeper engagement with your services.';
      
      case 'comment':
      case 'join':
      case 'attend':
        return 'Community-building objectives increase engagement and foster customer loyalty while providing valuable feedback and social proof.';
      
      default:
        // Create a generic explanation based on the theme
        return `This action-oriented objective directly supports your "${theme}" content theme by converting audience interest into measurable engagement that builds your business.`;
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Content | Mark1</title>
        <meta name="description" content="Generate content outlines and calendars" />
      </Head>
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Content Outline for {selectedStrategy?.name || 'Strategy'}</h1>
            <p>Here's a 3-week content plan based on your marketing strategy.</p>
          </div>
        </div>

        <div className={styles.content}>
          {isLoading && !contentOutline.length ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Preparing to generate your content outline...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                onClick={() => router.push('/marketing-plan')} 
                className={styles.returnButton}
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className={styles.outlineContainer}>
              {/* Always show the calendar button when a strategy is loaded, regardless of content status */}
              {selectedStrategy && (
                <div className={styles.calendarButtonContainer}>
                  <button 
                    onClick={() => router.push({
                      pathname: '/content/calendar-params',
                      query: { 
                        contentOutline: JSON.stringify(contentOutline.length > 0 ? contentOutline : []),
                        strategyId: selectedStrategy.id
                      }
                    })}
                    className={styles.calendarCallToAction}
                    disabled={contentOutline.length === 0 || contentOutline.some(week => week.loading) || !contentOutline.some(week => week.posts && week.posts.length > 0)}
                  >
                    <BsCalendarEvent className={styles.calendarIcon} />
                    Generate Content Calendar
                  </button>
                  <p className={styles.calendarDescription}>
                    {contentOutline.some(week => week.loading) ? (
                      "Please wait while we prepare your content..."
                    ) : contentOutline.length === 0 ? (
                      "Your content is being prepared. This button will activate once content is ready."
                    ) : !contentOutline.some(week => week.posts && week.posts.length > 0) ? (
                      "Content is still generating. The button will activate once at least one week of content is ready."
                    ) : (
                      "Create a structured calendar of posts across your social platforms with optimized scheduling."
                    )}
                  </p>
                </div>
              )}
              
              {themesLoading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>Generating weekly content themes...</p>
                </div>
              ) : (
                contentOutline.map((week, weekIndex) => (
                  <div key={weekIndex} className={styles.weekSection}>
                    <div className={styles.weekHeading}>
                      <h2>{`Week ${week.week}: ${week.theme}`}</h2>
                      
                      {/* Display segment information if available */}
                      {week.targetSegment && (
                        <div className={styles.weekSegment}>
                          <span className={styles.segmentLabel}>Target Audience:</span>
                          <p>{week.targetSegment}</p>
                        </div>
                      )}
                      
                      {/* Display phase information if available */}
                      {week.phase && (
                        <div className={styles.weekPhase}>
                          <span className={styles.phaseLabel}>Campaign Phase:</span>
                          <p>{week.phase}</p>
                        </div>
                      )}
                      
                      <div className={styles.weekObjective}>
                        <span className={styles.objectiveLabel}>Objective:</span>
                        <p>{week.objective}</p>
                        <p className={styles.objectiveExplanation}>
                          {getObjectiveExplanation(week.objective, week.theme)}
                        </p>
                      </div>
                    </div>
                    
                    {week.loading || weekLoadingStates[week.week]?.loading ? (
                      <div className={styles.loadingSection}>
                        <div className={styles.spinnerSmall}></div>
                        <p>Generating content for Week {week.week}...</p>
                      </div>
                    ) : week.error || weekLoadingStates[week.week]?.error ? (
                      <div className={styles.weekError}>
                        <p>Error generating content for this week: {week.error || weekLoadingStates[week.week]?.error}</p>
                        <button 
                          className={styles.retryButton} 
                          onClick={() => handleRetryWeek(week.week)}
                          disabled={contentOutline.some(w => w.loading)}
                        >
                          Retry this week
                        </button>
                      </div>
                    ) : week.posts && week.posts.length > 0 ? (
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
                    ) : (
                      <p>No content available for this week yet.</p>
                    )}
                    
                    {/* Add Feedback and Regenerate button */}
                    {week.posts && week.posts.length > 0 && !week.loading && (
                      <div className={styles.weekActions}>
                        <button 
                          className={styles.feedbackButton} 
                          onClick={() => handleOpenFeedbackModal(week.week)}
                          disabled={contentOutline.some(w => w.loading)}
                        >
                          Add Feedback and Regenerate
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Feedback Modal */}
              {isFeedbackModalOpen && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modal}>
                    <div className={styles.modalHeader}>
                      <h3>Add Feedback for Week {feedbackWeek}</h3>
                      <button 
                        className={styles.closeButton} 
                        onClick={handleCloseFeedbackModal}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.modalBody}>
                      <p>Please provide specific feedback on what you'd like to change or improve about this week's content:</p>
                      <textarea 
                        className={styles.feedbackTextarea}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="For example: Make the content more direct and action-oriented. Focus more on beginners. Add more video content instead of carousels..."
                        rows={5}
                      ></textarea>
                    </div>
                    <div className={styles.modalFooter}>
                      <button 
                        className={styles.cancelButton} 
                        onClick={handleCloseFeedbackModal}
                      >
                        Cancel
                      </button>
                      <button 
                        className={styles.regenerateButton} 
                        onClick={handleRegenerateWithFeedback}
                        disabled={!feedbackText.trim()}
                      >
                        Regenerate Content
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {!isLoading && contentOutline.some(week => week.posts && week.posts.length > 0) && (
                <div className={styles.actions}>
                  <button 
                    onClick={() => router.push('/marketing-plan')} 
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              )}
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