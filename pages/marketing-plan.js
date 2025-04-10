import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import styles from '../styles/MarketingPlan.module.css';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import { toast } from 'react-hot-toast';

const log = logger.createLogger('CreationDashboardPage');

// Helper function to get button class based on state
const getButtonClass = (stepStatus) => {
  switch (stepStatus) {
    case 'active':
      return `${styles.stepButton} ${styles.active}`;
    case 'inactive':
      return `${styles.stepButton} ${styles.inactive}`;
    case 'completed':
      return `${styles.stepButton} ${styles.completed}`;
    default:
      return styles.stepButton;
  }
};

// Aesthetic options for the modal
const aestheticOptions = [
  { id: 'minimalist', name: 'Minimalist', description: 'Clean, simple designs with ample white space' },
  { id: 'vibrant', name: 'Vibrant & Bold', description: 'Eye-catching colors and dynamic elements' },
  { id: 'professional', name: 'Professional', description: 'Polished, corporate-friendly style' },
  { id: 'playful', name: 'Playful & Fun', description: 'Casual, approachable style with personality' },
  { id: 'luxury', name: 'Luxury', description: 'Premium, high-end aesthetic with refined details' },
  { id: 'custom', name: 'Custom', description: 'Define your own custom aesthetic' }
];

export default function CreationDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentProject, loading: projectLoading } = useProject();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [projectData, setProjectData] = useState({
    hasStrategy: false,
    hasOutline: false,
    hasCalendar: false,
    strategyId: null,
    outlineId: null, // We might need this if outlines become standalone entities
    calendarId: null,
  });
  const [currentStep, setCurrentStep] = useState(0); // 0: Loading, 1: Strategy, 2: Outline, 3: Calendar, 4: Complete
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true); // State for welcome banner

  // State for aesthetic modal
  const [aestheticModal, setAestheticModal] = useState({
    visible: false,
    value: '',
    selectedOption: 'professional'
  });
  const [customAesthetic, setCustomAesthetic] = useState('');

  // Fetch data on user, project change, or mount
  useEffect(() => {
    if (authLoading || projectLoading) return;

    if (!user) {
      log.info('User not logged in, redirecting to login');
      router.push('/');
      return;
    }

    if (!currentProject) {
      log.info('No project selected, waiting.');
      // Optionally, prompt user to select a project or handle this case
      setIsLoadingData(false); // Stop loading if no project
      setCurrentStep(0); // Reset step if project changes
      setProjectData({ hasStrategy: false, hasOutline: false, hasCalendar: false, strategyId: null, outlineId: null, calendarId: null });
      return; // Don't fetch if no project
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setError('');
      log.info('Fetching marketing plan data for project', { projectId: currentProject.id });

      try {
        // 1. Check for Strategy
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('id')
          .eq('project_id', currentProject.id)
          .maybeSingle(); // Expect 0 or 1

        if (strategyError) {
          // --- Enhanced Error Logging --- 
          console.error("Supabase strategy fetch error object:", JSON.stringify(strategyError, null, 2));
          throw new Error(`Failed to fetch strategy: ${strategyError.message}`);
          // --- End Enhanced Logging ---
        }
        const hasStrategy = !!strategyData;
        const strategyId = strategyData?.id || null;

        let hasOutline = false;
        let hasCalendar = false;
        let calendarId = null;

        if (hasStrategy && strategyId) {
          // 2. Check for Content Outline (assuming linked to strategy)
          const { data: outlineData, error: outlineError } = await supabase
            .from('content_outlines')
            .select('id')
            .eq('strategy_id', strategyId)
            .limit(1);

          if (outlineError) throw new Error(`Failed to fetch content outline: ${outlineError.message}`);
          
          // More detailed logging for debugging
          console.log("Outline query results:", JSON.stringify(outlineData));
          
          hasOutline = outlineData && outlineData.length > 0;
          
          // Fix: Make sure we correctly extract the ID from the first result
          let outlineId = null;
          if (hasOutline && outlineData && outlineData.length > 0) {
            outlineId = outlineData[0].id;
            console.log("Using outline ID:", outlineId);
          }

          if (hasOutline) {
            // 3. Check for Content Calendar (assuming linked to strategy)
            // Adjust table/column names as needed (e.g., 'calendars', 'strategy_id')
            const { data: calendarData, error: calendarError } = await supabase
              .from('calendars') // Replace with your actual calendar table name
              .select('id')
              .eq('strategy_id', strategyId) // Assuming calendars link to strategies
              .maybeSingle();

            if (calendarError) throw new Error(`Failed to fetch content calendar: ${calendarError.message}`);
            hasCalendar = !!calendarData;
            calendarId = calendarData?.id || null;
          }
        }

        log.debug('Fetched project data:', { hasStrategy, hasOutline, hasCalendar, strategyId, outlineId, calendarId });
        setProjectData({ hasStrategy, hasOutline, hasCalendar, strategyId, outlineId, calendarId });

        // Determine current step based on fetched data
        if (hasCalendar) setCurrentStep(4); // All complete
        else if (hasOutline) setCurrentStep(3); // Calendar is next
        else if (hasStrategy) setCurrentStep(2); // Outline is next
        else setCurrentStep(1); // Strategy is first

      } catch (err) {
        log.error('Error fetching project data', err);
        setError(err.message || 'Failed to load marketing plan data.');
        setCurrentStep(0); // Reset step on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();

  }, [user, authLoading, currentProject, projectLoading, router]);


  // Determine button states and step text
  const { hasStrategy, hasOutline, hasCalendar, strategyId, outlineId, calendarId } = projectData;

  let stepText = 'Loading...';
  let progressPercent = 0;
  let strategyStatus = 'inactive';
  let outlineStatus = 'inactive';
  let calendarStatus = 'inactive';

  if (!isLoadingData && currentProject) {
    if (currentStep === 1) { // Strategy Step
        stepText = 'Step 1 of 3: Strategy';
        progressPercent = 15; // Small progress for starting step 1
        strategyStatus = 'active';
        outlineStatus = 'inactive';
        calendarStatus = 'inactive';
    } else if (currentStep === 2) { // Outline Step
        stepText = 'Step 2 of 3: Content Outline';
        progressPercent = 33; // Step 1 done
        strategyStatus = 'completed';
        outlineStatus = 'active';
        calendarStatus = 'inactive';
    } else if (currentStep === 3) { // Calendar Step
        stepText = 'Step 3 of 3: Content Calendar';
        progressPercent = 66; // Steps 1 & 2 done
        strategyStatus = 'completed';
        outlineStatus = 'completed';
        calendarStatus = 'active';
    } else if (currentStep === 4) { // All Completed
        stepText = 'Plan Complete!';
        progressPercent = 100;
        strategyStatus = 'completed';
        outlineStatus = 'completed';
        calendarStatus = 'completed';
    } else if (currentStep === 0 && error) { // Error State
      stepText = 'Error Loading';
      progressPercent = 0;
    } else if (currentStep === 0 && !currentProject) { // No Project Selected
      stepText = 'Select a Project';
      progressPercent = 0;
    }
  }


  // --- Button Handlers ---
  const handleCreateStrategy = () => {
    if (strategyStatus === 'active') {
      log.info('Navigating to create strategy', { projectId: currentProject.id });
      router.push(`/strategy/new?projectId=${currentProject.id}`);
    } else if (strategyStatus === 'completed' && strategyId) {
      log.info('Navigating to view/edit strategy', { strategyId });
      router.push(`/strategy/${strategyId}`); // Or an edit route
    }
  };

  const handleCreateOutline = () => {
    if (outlineStatus === 'active' && strategyId) {
      log.info('Opening aesthetic modal before creating content outline', { strategyId });
      // Open the aesthetic modal first
      setAestheticModal({
        visible: true,
        value: aestheticOptions.find(opt => opt.id === 'professional').name,
        selectedOption: 'professional'
      });
    } else if (outlineStatus === 'completed' && strategyId) {
      log.info('Navigating to view/edit content outline', { strategyId });
      // Navigate to edit the content outline in the same page used for creation
      router.push(`/content/new?strategyId=${strategyId}`);
    }
  };

  // Handle aesthetic option selection
  const handleAestheticSelect = (optionId) => {
    const selected = aestheticOptions.find(opt => opt.id === optionId);
    setAestheticModal({
      ...aestheticModal,
      selectedOption: optionId,
      value: optionId === 'custom' ? customAesthetic : selected.name
    });
  };

  // Handle custom aesthetic input change
  const handleCustomAestheticChange = (e) => {
    setCustomAesthetic(e.target.value);
    if (aestheticModal.selectedOption === 'custom') {
      setAestheticModal({
        ...aestheticModal,
        value: e.target.value
      });
    }
  };

  // Handle submission of aesthetic selection
  const handleAestheticSubmit = () => {
    if (!aestheticModal.value.trim()) {
      toast.error('Please select or enter an aesthetic');
      return;
    }
    
    log.info('Navigating to create content outline with aesthetic', { 
      strategyId, 
      aesthetic: aestheticModal.value 
    });
    
    // Navigate to the content outline creation page with the selected aesthetic
    router.push(`/content/new?strategyId=${strategyId}&aesthetic=${encodeURIComponent(aestheticModal.value)}`);
    
    // Close the modal and reset
    setAestheticModal({
      visible: false,
      value: '',
      selectedOption: 'professional'
    });
    setCustomAesthetic('');
  };

  const handleCreateCalendar = () => {
    if (calendarStatus === 'active' && strategyId) {
      log.info('Navigating to create content calendar', { strategyId, outlineId: projectData.outlineId });
      
      // Debug info to help track down the issue
      console.log("ProjectData:", JSON.stringify(projectData));
      
      // Check if we have a valid outlineId
      if (!projectData.outlineId) {
        // Try to fetch the outline ID directly before giving up
        console.log("OutlineId not in projectData, attempting to fetch directly");
        
        const fetchOutlineId = async () => {
          try {
            const { data: outlineData, error } = await supabase
              .from('content_outlines')
              .select('id')
              .eq('strategy_id', strategyId)
              .limit(1);
            
            if (error) throw error;
            
            if (outlineData && outlineData.length > 0) {
              const outlineId = outlineData[0].id;
              console.log("Successfully fetched outline ID:", outlineId);
              // Navigate with the directly fetched ID
              router.push(`/content/calendar-params?strategyId=${strategyId}&outlineId=${outlineId}`);
            } else {
              toast.error("Content outline not found. Please create a content outline first.");
            }
          } catch (err) {
            console.error("Error fetching outline ID:", err);
            toast.error("Failed to fetch content outline. Please try again or return to the content outline page.");
          }
        };
        
        fetchOutlineId();
        return;
      }
      
      // Pass both strategyId and outlineId to the calendar params page
      router.push(`/content/calendar-params?strategyId=${strategyId}&outlineId=${projectData.outlineId}`);
    } else if (calendarStatus === 'completed' && calendarId) {
        log.info('Navigating to view/edit content calendar', { calendarId });
        router.push(`/calendar/${calendarId}`); // Navigate to the specific calendar
    }
  };

  const handleGoToDashboard = () => {
    if (calendarId) {
      log.info('Navigating to content management dashboard (calendar)', { calendarId });
      router.push(`/calendar/${calendarId}`);
    } else {
      toast.error("Complete the Content Calendar step first.");
    }
  };

  // Loading state for initial auth/project check
  if (authLoading || projectLoading) {
    return (
      <div className={styles.container}>
        <Head>
            <title>Loading Dashboard... | Mark1</title>
        </Head>
        <main className={styles.main}>
            <div className={styles.loadingIndicator}>Loading...</div>
        </main>
      </div>
    );
  }

  // Render when no user or no project selected (after loading checks)
  if (!user) {
     // Should have been redirected, but good fallback
     return <div>Redirecting to login...</div>;
  }

  if (!currentProject) {
      return (
          <div className={styles.container}>
              <Head>
                  <title>Select Project | Mark1</title>
                  <meta name="description" content="Select a project to start building your marketing plan." />
              </Head>
              <main className={styles.main}>
                  <div className={styles.centeredMessage}>
                      <h1>Select a Project</h1>
                      <p>Please select or create a project to begin building your marketing plan.</p>
                      {/* Optionally add a button to open the project selector modal if it's not globally accessible */}
                  </div>
              </main>
          </div>
      );
  }

  // Main Dashboard Render
  return (
    <div className={styles.container}>
      <Head>
        <title>Creation Dashboard | Mark1</title>
        <meta name="description" content="Build your marketing plan step-by-step: Strategy, Content Outline, and Content Calendar." />
      </Head>

      {/* Tooltip component needs to be rendered */}
      <Tooltip id="inactive-tooltip" />

      {/* Aesthetic Selection Modal */}
      {aestheticModal.visible && (
        <div className={styles.modalOverlay}>
          <div className={styles.aestheticModal}>
            <div className={styles.modalHeader}>
              <h3>Select Your Content Aesthetic</h3>
              <button 
                onClick={() => setAestheticModal({...aestheticModal, visible: false})}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Choose the visual style and tone that best represents your brand
              </p>
              
              <div className={styles.aestheticGrid}>
                {aestheticOptions.map(option => (
                  <div 
                    key={option.id}
                    className={`${styles.aestheticCard} ${aestheticModal.selectedOption === option.id ? styles.selectedAesthetic : ''}`}
                    onClick={() => handleAestheticSelect(option.id)}
                  >
                    <div className={styles.aestheticInfo}>
                      <h4>{option.name}</h4>
                      <p>{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {aestheticModal.selectedOption === 'custom' && (
                <div className={styles.customAestheticInput}>
                  <label htmlFor="customAesthetic">Describe your preferred content style:</label>
                  <input
                    type="text"
                    id="customAesthetic"
                    placeholder="Describe your custom aesthetic style..."
                    value={customAesthetic}
                    onChange={handleCustomAestheticChange}
                    className={styles.customInput}
                  />
                </div>
              )}
              
              <div className={styles.modalActions}>
                <button 
                  onClick={() => setAestheticModal({...aestheticModal, visible: false})}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAestheticSubmit}
                  className={styles.continueButton}
                  disabled={!aestheticModal.value.trim()}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        {/* Welcome Banner (conditional) */}
        {showWelcomeBanner && currentStep === 1 && !isLoadingData && !error && (
          <div className={styles.welcomeBanner}>
            <span>👋 Start by creating your Strategy!</span>
            <button
              onClick={() => setShowWelcomeBanner(false)}
              className={styles.closeBannerButton}
              aria-label="Dismiss welcome banner"
            >
              &times;
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className={styles.headerBar}>
          <span className={styles.headerTitle}>Mark1 - Creation Dashboard</span>
          <span className={styles.headerProject}>Project: {currentProject?.name || 'Loading...'}</span>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.progressText}>{stepText}</span>
          {/* Mobile Progress Text (controlled via CSS) */}
          <span className={styles.progressTextMobile}>{currentStep > 0 && currentStep < 4 ? `Step ${currentStep}/3` : stepText}</span>
        </div>

        {/* Instructional Text */}
        <p className={styles.instructionalText}>
          Build your marketing plan step-by-step. Complete each step to unlock the next.
        </p>

        {/* Loading/Error Display within content area */}
         {isLoadingData && <div className={styles.loadingIndicator}>Loading plan status...</div>}
         {error && <div className={styles.errorText}>Error: {error}</div>}

        {/* Action Buttons - Only show if not loading and no error */}
        {!isLoadingData && !error && (
          <>
            <div className={styles.stepButtonsContainer}>
              {/* 1. Create Strategy Button */}
              <button
                className={getButtonClass(strategyStatus)}
                onClick={handleCreateStrategy}
                disabled={strategyStatus === 'inactive'} // Technically covered by class, but explicit is good
                data-tooltip-id={strategyStatus === 'inactive' ? "inactive-tooltip" : undefined}
                data-tooltip-content={strategyStatus === 'inactive' ? "Complete previous steps first" : undefined} // Generic tooltip
              >
                {strategyStatus === 'completed' && <span className={styles.completedLabel}>Already Created</span>}
                Create Strategy
                {strategyStatus === 'active' && <span className={styles.badge}>Next Step</span>}
                {strategyStatus === 'completed' && <span className={styles.viewEditLink}>View/Edit</span>}
              </button>

              {/* 2. Create Content Outline Button */}
              <button
                className={getButtonClass(outlineStatus)}
                onClick={handleCreateOutline}
                disabled={outlineStatus === 'inactive'}
                data-tooltip-id={outlineStatus === 'inactive' ? "inactive-tooltip" : undefined}
                data-tooltip-content={outlineStatus === 'inactive' ? "Complete Strategy first" : undefined}
              >
                 {outlineStatus === 'completed' && <span className={styles.completedLabel}>Already Created</span>}
                Create Content Outline
                {outlineStatus === 'active' && <span className={styles.badge}>Next Step</span>}
                {outlineStatus === 'completed' && <span className={styles.viewEditLink}>View/Edit</span>}
              </button>

              {/* 3. Create Content Calendar Button */}
              <button
                className={getButtonClass(calendarStatus)}
                onClick={handleCreateCalendar}
                disabled={calendarStatus === 'inactive'}
                data-tooltip-id={calendarStatus === 'inactive' ? "inactive-tooltip" : undefined}
                data-tooltip-content={calendarStatus === 'inactive' ? "Complete Content Outline first" : undefined}
              >
                 {calendarStatus === 'completed' && <span className={styles.completedLabel}>Already Created</span>}
                Create Content Calendar
                {calendarStatus === 'active' && <span className={styles.badge}>Next Step</span>}
                {calendarStatus === 'completed' && <span className={styles.viewEditLink}>View/Edit</span>}
              </button>
            </div>

            {/* Go to Dashboard Button */}
            <div className={styles.dashboardButtonContainer}>
              <button
                className={`${styles.goToDashboardButton} ${!hasCalendar ? styles.inactive : ''}`}
                onClick={handleGoToDashboard}
                disabled={!hasCalendar}
                data-tooltip-id={!hasCalendar ? "inactive-tooltip" : undefined}
                data-tooltip-content={!hasCalendar ? "Complete Content Calendar first" : undefined}
              >
                Go to Content Management Dashboard
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 