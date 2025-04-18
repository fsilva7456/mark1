import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Strategy.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { toast } from 'react-hot-toast';
import React from 'react';

export default function NewStrategy() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    location: '',
    answers: []
  });
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrix, setMatrix] = useState({
    targetAudience: [],
    objectives: [],
    keyMessages: []
  });
  
  // Add state for audience regeneration
  const [regeneratingAudience, setRegeneratingAudience] = useState(null);
  
  // Update feedback popup state to match content outline pattern
  const [feedbackPopup, setFeedbackPopup] = useState({
    visible: false,
    section: '',
    index: null,
    text: '',
    currentValue: '',
  });
  const [suggestions, setSuggestions] = useState([]);
  
  const messagesEndRef = useRef(null);
  const feedbackInputRef = useRef(null);
  const chatInputRef = useRef(null);
  
  // Add state for storing the strategy ID
  const [strategyId, setStrategyId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const { user } = useAuth();
  const { currentProject, projects, setShowProjectSelector } = useProject();
  
  // Use effect to check if a project is selected
  useEffect(() => {
    if (user && (!currentProject || !projects || projects.length === 0)) {
      // Show project selector if no project is selected
      setShowProjectSelector(true);
    }
  }, [user, currentProject, projects, setShowProjectSelector]);
  
  // Replace the AI suggestions code with this modified version that works with the chat flow
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Track current question in a different way
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Add these state variables near the top with other state variables
  const [aestheticModal, setAestheticModal] = useState({
    visible: false,
    value: ''
  });
  
  // Improve the scrollToBottom function even more and add additional scroll calls
  const scrollToBottom = () => {
    // Use multiple timeouts with increasing delays for more reliable scrolling
    const scrollAttempt = (delay) => {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }
      }, delay);
    };

    // Try multiple scroll attempts with increasing delays
    scrollAttempt(100);  // Quick initial attempt
    scrollAttempt(300);  // Medium delay attempt
    scrollAttempt(600);  // Longer delay to ensure rendering is complete
    scrollAttempt(900);  // Extra long delay for when suggestions might be loading
  };
  
  // Initial setup - show first AI message
  useEffect(() => {
    if (messages.length === 0) {
      // Initial message from the AI assistant
      setIsProcessing(true);
      sendToGemini("", true).then(response => {
        setMessages([{
          sender: 'assistant',
          text: response,
        }]);
        setIsProcessing(false);
      });
    }
    
    scrollToBottom();
  }, []);
  
  // Keep input focused after submission
  useEffect(() => {
    if (!showMatrix && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [messages, showMatrix]);
  
  // Focus input when popup opens
  useEffect(() => {
    if (feedbackPopup.visible && feedbackInputRef.current) {
      feedbackInputRef.current.focus();
      generateSuggestions(feedbackPopup.currentValue, feedbackPopup.section);
    }
  }, [feedbackPopup.visible]);
  
  // Update the useEffect hook for scrolling
  useEffect(() => {
    // Scroll to bottom whenever messages change or when processing state changes
    scrollToBottom();
  }, [messages, isProcessing]);
  
  // Replace the dynamic sendToGemini with a hardcoded version
  const sendToGemini = async (userInput, isInitial = false) => {
    try {
      console.log("Using enhanced chat flow, message count:", messages.length);
      
      // Initial greeting - first message
      if (isInitial) {
        return "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?";
      }
      
      // Second message - after user provides name
      if (messages.length === 1) {
        const name = userInput.trim();
        return `Great to meet you, ${name}! Where are you located? This will help me tailor recommendations to your local market (e.g., Toronto, Calgary, or another city).`;
      }
      
      // Third message - after user provides location
      if (messages.length === 3) {
        return `Thanks for sharing your location. Now I'd like to understand more about your fitness business. What type of fitness services do you offer? Please include:
        
• Your main service type (personal training, group classes, online coaching, etc.)
• Your specialization or focus area (strength, yoga, HIIT, etc.)
• How long you've been in business
• Where you primarily operate (in-person, online, hybrid)`;
      }
      
      // Fourth message - after user describes business
      if (messages.length === 5) {
        return `Thanks for sharing that information about your fitness business. Now I'd like to understand your target audience better. Who are your ideal clients? Please include:
        
• Age range (e.g., 25-45)
• Fitness level (beginners, intermediate, advanced)
• Specific needs or pain points they have
• Their primary fitness goals
• Any demographic details relevant to your marketing`;
      }
      
      // Fifth message - after user describes target audience
      if (messages.length === 7) {
        return `Great insight about your audience! Now let's focus on your marketing objectives. What specific actions do you want your target audience to take? 
        
Please list 2-3 specific behaviors you want to encourage, such as:
• "Book a free consultation"
• "Sign up for a class package"
• "Download a free workout guide"
• "Follow on social media"
• "Refer friends and family"`;
      }
      
      // Sixth message - after user describes objectives
      if (messages.length === 9) {
        return `Thanks for sharing your objectives. Now, what makes your fitness approach unique compared to others in your area? 
        
Please describe your competitive advantage in terms of:
• Your unique methodology or approach
• Special credentials or expertise you have
• Client results that set you apart
• Values or philosophy that guide your business`;
      }
      
      // Seventh message - after user describes unique approach
      if (messages.length === 11) {
        return `That's really helpful! Now, let's talk about content creation. What types of content do you feel most comfortable creating? 
        
Please indicate which of these you prefer creating and have resources for:
• Videos (workout demos, tips, client testimonials)
• Photos (before/after, exercise demonstrations)
• Written content (blogs, newsletters, social media posts)
• Live sessions (Instagram/Facebook Lives, webinars)
• Audio content (podcasts, guided workouts)`;
      }
      
      // Eighth message - after user describes content preferences
      if (messages.length === 13) {
        return `Based on what you've shared, I have one more important question. Who are your top 2-3 competitors, and what do you notice about their marketing approach? 
        
Please share:
• Competitor names
• What they seem to do well
• What opportunities or gaps you see in their approach
• How clients might compare you to them`;
      }
      
      // Ninth message - after user describes competitors  
      if (messages.length === 15) {
        return `Perfect! I now have enough information to create a comprehensive marketing strategy matrix for your fitness business. This will serve as the foundation for your marketing efforts. [READY_FOR_MATRIX]`;
      }
      
      // Fallback for any other message count
      return `Thanks for that information! I'm building your marketing strategy. What's the biggest challenge you currently face in attracting or retaining clients for your fitness business in your area?`;
      
    } catch (error) {
      console.error('Error in enhanced response flow:', error);
      
      // Provide appropriate fallback based on message count
      if (isInitial || messages.length === 0) {
        return "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?";
      }
      
      return "I apologize for the technical difficulty. Let's continue with your strategy. Could you tell me more about your fitness business goals?";
    }
  };
  
  // Update the generateMatrix function with more detailed logging
  const generateMatrix = async () => {
    try {
      setIsProcessing(true);
      
      // Create matrix based on user's answers
      const userAnswers = userData.answers;
      
      // Extract information from answers
      const name = userData.name || 'User';
      const location = userData.location || 'Toronto'; // Default to Toronto if no location provided
      const business = userAnswers[2] || 'fitness business'; // Index shifted due to location question
      const audience = userAnswers[3] || 'fitness enthusiasts';
      const goals = userAnswers[4] || 'attract new clients';
      const unique = userAnswers[5] || 'personalized approach';
      const content = userAnswers[6] || 'various content types';
      
      // Fetch gym data to inform the strategy - use the user's location
      console.log("DEBUG: Starting to fetch gym data for strategy generation in location:", location);
      const gymData = await fetchCompetitiveInsights(location);
      console.log("DEBUG: Gym data fetch result:", gymData ? `${gymData.length} records` : "no data");
      
      // Variables to track errors
      let errorMessage = "";
      let error = false;
      
      // Try to generate enhanced strategy with Gemini
      if (gymData && gymData.length > 0) {
        console.log("DEBUG: Gym data available, calling generate enhanced strategy");
        // Send all data to Gemini for analysis
        const result = await generateEnhancedStrategy(
          name, location, business, audience, goals, unique, content, gymData
        );
        
        console.log("DEBUG: Enhanced strategy result:", result);
        
        if (result.success && result.matrix) {
          // Set the matrix state with Gemini's enhanced strategy
          console.log("DEBUG: Using Gemini-generated strategy");
          setMatrix(result.matrix);
          setShowMatrix(true);
          setIsProcessing(false);
          return;
        } else {
          // Handle error case - no fallback, just report the error
          error = true;
          errorMessage = "Could not generate strategy matrix with Gemini. Specific errors:\n\n";
          if (result.errors && result.errors.length > 0) {
            errorMessage += result.errors.map((err, idx) => `${idx + 1}. ${err}`).join("\n");
          } else {
            errorMessage += "Unknown error occurred during strategy generation.";
          }
        }
      } else {
        error = true;
        errorMessage = "Could not fetch competitor data to generate a strategy. Please try again.";
      }
      
      // If we've reached this point, there was an error
      if (error) {
        // Display the error state in the UI instead of the matrix
        setShowMatrix(true); // Still switch to matrix view
        setMatrix({
          error: true,
          errorMessage: errorMessage
        });
      }
      
    } catch (error) {
      console.error('Error generating matrix:', error);
      
      // Set error state in matrix
      setMatrix({
        error: true,
        errorMessage: `Failed to generate strategy: ${error.message}`
      });
      
      setShowMatrix(true);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update generateEnhancedStrategy with better error handling
  const generateEnhancedStrategy = async (name, location, business, audience, goals, unique, content, gymData) => {
    try {
      console.log("DEBUG: Generating enhanced strategy with gym data...");
      
      // Format gym data for the API
      const formattedGymData = gymData.map(gym => ({
        name: gym.name || "Unknown",
        offerings: gym.offerings || "Not specified",
        positives: gym.positives || "Not specified",
        negatives: gym.negatives || "Not specified",
        targetAudience: gym.targetAudience || "Not specified",
        opportunities: gym.opportunities || "Not specified"
      }));
      
      let attempts = 0;
      const maxAttempts = 2;
      let matrix = null;
      let errors = [];
      
      while (!matrix && attempts < maxAttempts) {
        attempts++;
        console.log(`DEBUG: Strategy generation attempt ${attempts}/${maxAttempts}`);
        
        try {
          const response = await fetch('/api/strategy/generate-with-insights', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userData: {
                name,
                location,
                business,
                audience,
                goals,
                unique,
                content
              },
              gymData: formattedGymData
            }),
            timeout: 20000
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            errors.push(`API request failed with status ${response.status}: ${errorText}`);
            continue;
          }
          
          const data = await response.json();
          
          // Validate the matrix structure
          if (data.matrix && 
              data.matrix.targetAudience && 
              data.matrix.objectives && 
              data.matrix.keyMessages) {
            
            // Additional validation for each section
            const validationErrors = [];
            
            if (!Array.isArray(data.matrix.targetAudience) || data.matrix.targetAudience.length !== 3) {
              validationErrors.push("targetAudience: Expected 3 items but got " + 
                                   (Array.isArray(data.matrix.targetAudience) ? 
                                    data.matrix.targetAudience.length : "non-array"));
            }
            
            if (!Array.isArray(data.matrix.objectives) || data.matrix.objectives.length !== 3) {
              validationErrors.push("objectives: Expected 3 items but got " + 
                                   (Array.isArray(data.matrix.objectives) ? 
                                    data.matrix.objectives.length : "non-array"));
            }
            
            if (!Array.isArray(data.matrix.keyMessages) || data.matrix.keyMessages.length !== 3) {
              validationErrors.push("keyMessages: Expected 3 items but got " + 
                                   (Array.isArray(data.matrix.keyMessages) ? 
                                    data.matrix.keyMessages.length : "non-array"));
            }
            
            if (validationErrors.length > 0) {
              errors.push("Matrix validation failed: " + validationErrors.join(", "));
              continue;
            }
            
            console.log("DEBUG: Valid matrix structure received from API");
            matrix = data.matrix;
          } else {
            const missingFields = [];
            if (!data.matrix) missingFields.push("matrix");
            else {
              if (!data.matrix.targetAudience) missingFields.push("targetAudience");
              if (!data.matrix.objectives) missingFields.push("objectives");
              if (!data.matrix.keyMessages) missingFields.push("keyMessages");
            }
            errors.push(`Invalid matrix structure, missing: ${missingFields.join(", ")}`);
          }
        } catch (apiError) {
          errors.push(`API call error on attempt ${attempts}: ${apiError.message}`);
        }
      }
      
      // If we still don't have a valid matrix after all attempts, return the errors
      if (!matrix) {
        return { 
          success: false, 
          errors: errors 
        };
      }
      
      return { 
        success: true, 
        matrix: matrix 
      };
      
    } catch (error) {
      console.error("DEBUG: Error in enhanced strategy generation:", error);
      return { 
        success: false, 
        errors: [`Unexpected error: ${error.message}`] 
      };
    }
  };
  
  // Update handleSubmit to handle the hardcoded flow
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentInput.trim() || isProcessing) return;
    
    // Add user message to chat
    const updatedMessages = [
      ...messages,
      {
        sender: 'user',
        text: currentInput,
      }
    ];
    setMessages(updatedMessages);
    setCurrentInput('');
    
    // Scroll to bottom after user message
    scrollToBottom();
    
    // Store user input in userData
    setUserData(prev => {
      // First answer is name
      if (messages.length === 1) {
        return {
          ...prev,
          name: currentInput,
          answers: [...prev.answers, currentInput]
        };
      }
      // Second answer is location
      else if (messages.length === 3) {
        return {
          ...prev,
          location: currentInput,
          answers: [...prev.answers, currentInput]
        };
      }
      // All other answers
      else {
        return {
          ...prev,
          answers: [...prev.answers, currentInput]
        };
      }
    });
    
    // Process the user input with the hardcoded flow
    setIsProcessing(true);
    
    try {
      // Get response from hardcoded flow
      const response = await sendToGemini(currentInput);
      
      // Check for matrix trigger
      if (response.includes('[READY_FOR_MATRIX]')) {
        // Clean up the response by removing the trigger
        const cleanResponse = response.replace('[READY_FOR_MATRIX]', '').trim();
        
        // Add AI response to chat
        setMessages([
          ...updatedMessages,
          {
            sender: 'assistant',
            text: cleanResponse,
          }
        ]);
        
        // Scroll immediately and then again after a longer delay
        scrollToBottom();
        // Add a forced scroll directly without animation for one of the attempts
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ block: 'end' });
          }
        }, 800);
        
        // Generate and show matrix
        setTimeout(() => {
          generateMatrix();
        }, 1000);
      } else {
        // Add AI response to chat
        setMessages([
          ...updatedMessages,
          {
            sender: 'assistant',
            text: response,
          }
        ]);
        
        // Scroll immediately and then again after a longer delay
        scrollToBottom();
        // Add a forced scroll directly without animation for one of the attempts
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ block: 'end' });
          }
        }, 800);
      }
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Add fallback message
      setMessages([
        ...updatedMessages,
        {
          sender: 'assistant',
          text: "I apologize for the technical difficulty. Let's continue with your strategy development. Could you tell me more about your fitness business?",
        }
      ]);
      
      // Make sure to scroll even after an error
      scrollToBottom();
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update fetchCompetitiveInsights to better handle errors and use hardcoded data if needed
  const fetchCompetitiveInsights = async (userLocation) => {
    try {
      // Get gyms near the user's location
      console.log("DEBUG: Fetching competitor data for location:", userLocation);
      
      const response = await fetch(`/api/gyms/get-competitive-data?location=${userLocation}`);
      console.log("DEBUG: Competitor API response status:", response.status);
      
      if (!response.ok) {
        console.log("DEBUG: API error, status:", response.status);
        // Return hardcoded data if API fails
        return getHardcodedGymData();
      }
      
      const responseData = await response.json();
      console.log("DEBUG: API response data:", responseData);
      
      if (!responseData.data || responseData.data.length === 0) {
        console.log("DEBUG: No gym data in API response, using hardcoded data");
        return getHardcodedGymData();
      }
      
      // Use the gym data for Gemini prompting
      const competitiveInsights = responseData.data.map(gym => ({
        name: gym.Name,
        offerings: gym.Offerings, 
        positives: gym["What People Are Saying (Positive)"],
        negatives: gym["What People Are Saying (Negative)"],
        opportunities: gym["Insights/Opportunities/Suggestions for a Self-Employed Personal Trainer (In-Person & Online)"],
        targetAudience: gym["Primary Target Audience for Gym"],
        location: gym["Localized Location in Downtown Toronto"]
      }));
      
      console.log("DEBUG: Mapped competitive insights:", competitiveInsights.length);
      return competitiveInsights;
    } catch (error) {
      console.error("Error fetching competitive insights:", error);
      // Return hardcoded data in case of any error
      return getHardcodedGymData();
    }
  };
  
  // Add hardcoded gym data function for fallback
  const getHardcodedGymData = () => {
    console.log("DEBUG: Using hardcoded gym data");
    return [
      {
        name: "GoodLife Fitness",
        offerings: "Full service gym with equipment, classes, and personal training",
        positives: "Modern facilities, variety of equipment, convenient locations",
        negatives: "Often crowded, impersonal service, extra charges for classes",
        opportunities: "Offer more personalized service and individual attention that large chains lack",
        targetAudience: "General fitness enthusiasts, 25-55 age range",
        location: "Downtown Toronto"
      },
      {
        name: "F45 Training",
        offerings: "High-intensity functional training in 45-minute group sessions",
        positives: "Effective workouts, community atmosphere, innovative exercises",
        negatives: "High price point, may be too intense for beginners",
        opportunities: "Provide more beginner-friendly options with personalized guidance",
        targetAudience: "Fitness enthusiasts seeking efficiency, 25-40 age range",
        location: "Downtown Toronto"
      },
      {
        name: "Studio Lagree",
        offerings: "Megaformer workouts focused on core strength and low-impact training",
        positives: "Effective results, trendy workout, good for all fitness levels",
        negatives: "Expensive, limited class times, steep learning curve",
        opportunities: "Offer more accessible training that combines core strength with other fitness methods",
        targetAudience: "Affluent professionals, predominantly women, 28-45 age range",
        location: "Downtown Toronto"
      }
    ];
  };
  
  const handleSaveStrategy = async () => {
    if (!user) {
      toast.error('You must be logged in to save a strategy');
      return;
    }
    
    if (!currentProject) {
      toast.error('You must select a project to save your strategy');
      setShowProjectSelector(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const strategyData = {
        user_id: user.id,
        project_id: currentProject.id,
        name: userData.name || 'Untitled Strategy',
        business_description: userData.answers[2] || '',
        target_audience: matrix.targetAudience,
        objectives: matrix.objectives,
        key_messages: matrix.keyMessages,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const { data, error } = await supabase
        .from('strategies')
        .insert([strategyData])
        .select('id');
      
      if (error) throw error;
      
      console.log('Strategy saved, ID:', data[0]?.id);
      setStrategyId(data[0]?.id);
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error(`Failed to save strategy: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCellClick = (section, index, value) => {
    setFeedbackPopup({
      visible: true,
      section,
      index,
      text: '',
      currentValue: value
    });
  };
  
  const generateSuggestions = (input, section) => {
    // Don't try to incorporate input text into suggestions
    // Instead, provide contextual suggestions based on section
    
    const mockSuggestions = {
      targetAudience: [
        "Busy working professionals (25-45) seeking time-efficient fitness solutions",
        "Health-conscious individuals looking to improve overall wellness and build healthy habits",
        "Fitness beginners who want personalized guidance and supportive community"
      ],
      objectives: [
        "Encourage prospects to book a free consultation through your website",
        "Motivate followers to sign up for a 7-day challenge or trial program",
        "Get visitors to download your nutrition guide or workout planner"
      ],
      keyMessages: [
        "Transform your fitness journey with our evidence-based, personalized approach",
        "Experience results that last through sustainable habit-building and expert guidance",
        "Join a supportive community that keeps you accountable and motivated"
      ]
    };
    
    setSuggestions(mockSuggestions[section] || []);
  };

  // Function to open the feedback modal for an audience
  const handleOpenFeedbackModal = (audienceIndex) => {
    const audience = matrix.enhancedStrategy.audiences[audienceIndex];
    if (!audience) {
      toast.error("Audience not found in strategy matrix.");
      return;
    }
    
    setFeedbackPopup({
      visible: true,
      section: 'audience',
      index: audienceIndex,
      text: '',
      currentValue: audience.segment
    });
  };
  
  // Function to open the feedback modal for an objective
  const handleOpenObjectiveModal = (audienceIndex, objectiveIndex) => {
    const audience = matrix.enhancedStrategy.audiences[audienceIndex];
    if (!audience || !audience.objectives[objectiveIndex]) {
      toast.error("Objective not found in strategy matrix.");
      return;
    }
    
    setFeedbackPopup({
      visible: true,
      section: 'objective',
      audienceIndex: audienceIndex,
      objectiveIndex: objectiveIndex,
      text: audience.objectives[objectiveIndex].objective,
      currentValue: audience.objectives[objectiveIndex].objective
    });
  };
  
  // Function to open the feedback modal for a key message
  const handleOpenMessageModal = (audienceIndex, messageIndex) => {
    const audience = matrix.enhancedStrategy.audiences[audienceIndex];
    if (!audience || !audience.keyMessages[messageIndex]) {
      toast.error("Key message not found in strategy matrix.");
      return;
    }
    
    setFeedbackPopup({
      visible: true,
      section: 'keyMessage',
      audienceIndex: audienceIndex,
      messageIndex: messageIndex,
      text: audience.keyMessages[messageIndex],
      currentValue: audience.keyMessages[messageIndex]
    });
  };

  // Function to handle regeneration with feedback
  const handleRegenerateWithFeedback = async () => {
    if (feedbackPopup.section !== 'audience' || feedbackPopup.index === null || !feedbackPopup.text.trim()) {
      return;
    }
    
    const audienceIndex = feedbackPopup.index;
    const feedbackText = feedbackPopup.text;
    
    // Close the popup
    setFeedbackPopup({
      visible: false,
      section: '',
      index: null,
      text: '',
      currentValue: ''
    });
    
    // Set regenerating state
    setRegeneratingAudience(audienceIndex);
    
    try {
      // Get the current audience segment name for the prompt
      const audienceSegment = matrix.enhancedStrategy.audiences[audienceIndex].segment;
      
      const response = await fetch('/api/strategy/regenerate-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audienceIndex: audienceIndex,
          currentAudience: audienceSegment,
          feedback: feedbackText,
          userData: {
            name: userData.name,
            location: userData.location,
            business: userData.answers[2] || '',
            audience: userData.answers[3] || ''
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.audience) {
        // Update the matrix with the new audience data
        const updatedMatrix = { ...matrix };
        updatedMatrix.enhancedStrategy.audiences[audienceIndex] = data.audience;
        setMatrix(updatedMatrix);
        toast.success('Audience regenerated successfully with your feedback!');
      } else {
        throw new Error('Invalid audience data returned');
      }
    } catch (error) {
      console.error('Error regenerating audience:', error);
      toast.error('Failed to regenerate audience. Please try again.');
    } finally {
      setRegeneratingAudience(null);
    }
  };
  
  // Update handleSaveFeedback to handle all section types
  const handleSaveFeedback = () => {
    // If no feedback provided, just close the popup
    if (!feedbackPopup.text.trim()) {
      setFeedbackPopup({
        visible: false,
        section: '',
        index: null,
        text: '',
        currentValue: ''
      });
      return;
    }
    
    // Handle different sections
    if (feedbackPopup.section === 'audience') {
      // Handle regeneration with feedback for audience
      handleRegenerateWithFeedback();
    } else if (feedbackPopup.section === 'objective') {
      // Handle objective update
      const updatedMatrix = { ...matrix };
      updatedMatrix.enhancedStrategy.audiences[feedbackPopup.audienceIndex].objectives[feedbackPopup.objectiveIndex].objective = feedbackPopup.text;
      setMatrix(updatedMatrix);
      
      // Close the popup
      setFeedbackPopup({
        visible: false,
        section: '',
        index: null,
        text: '',
        currentValue: ''
      });
      toast.success('Objective updated successfully!');
    } else if (feedbackPopup.section === 'keyMessage') {
      // Handle key message update
      const updatedMatrix = { ...matrix };
      updatedMatrix.enhancedStrategy.audiences[feedbackPopup.audienceIndex].keyMessages[feedbackPopup.messageIndex] = feedbackPopup.text;
      setMatrix(updatedMatrix);
      
      // Close the popup
      setFeedbackPopup({
        visible: false,
        section: '',
        index: null,
        text: '',
        currentValue: ''
      });
      toast.success('Key message updated successfully!');
    }
  };

  // Add handleFeedbackChange function
  const handleFeedbackChange = (e) => {
    setFeedbackPopup({
      ...feedbackPopup,
      text: e.target.value
    });
  };

  // Modify the useEffect hook for generating suggestions
  useEffect(() => {
    console.log("📱 [CLIENT] Messages changed, current count:", messages.length);
    
    // Update current question index based on message count and generate suggestions immediately
    if (messages.length > 0 && messages.length % 2 === 1) {
      // AI messages are at odd indices (1, 3, 5, etc.)
      const currentAIMessageIndex = messages.length - 1;
      const currentQuestion = messages[currentAIMessageIndex].text;
      
      // Calculate which question number this is (1-indexed)
      const questionNumber = Math.ceil(currentAIMessageIndex / 2);
      console.log(`📱 [CLIENT] AI message detected at index ${currentAIMessageIndex}, question #${questionNumber}`);
      setCurrentQuestionIndex(questionNumber);
      
      console.log(`📱 [CLIENT] Preparing to generate suggestions for question #${questionNumber}:`, currentQuestion);
      
      // Clear previous suggestions first to avoid showing old suggestions
      setAiSuggestions([]);
      
      // Add a small delay to ensure the UI updates before generating new suggestions
      console.log("📱 [CLIENT] Setting timeout to generate suggestions");
      setTimeout(() => {
        console.log(`📱 [CLIENT] Timeout triggered, calling generateAISuggestionsForChat for question #${questionNumber}`);
        generateAISuggestionsForChat(currentQuestion, questionNumber);
      }, 100);
    } else {
      console.log("📱 [CLIENT] No AI message detected or even-numbered message count, skipping suggestion generation");
    }
  }, [messages]);

  // Update the function signature to accept questionNumber
  const generateAISuggestionsForChat = async (latestQuestion, questionNumber) => {
    // Skip generating suggestions for name question (first question)
    if (questionNumber === 0) {
      console.log("📱 [CLIENT] Skipping suggestions for name question");
      setAiSuggestions([]);
      return;
    }
    
    // Skip generating suggestions for location question (second question)
    if (questionNumber === 1) {
      console.log("📱 [CLIENT] Skipping suggestions for location question");
      setAiSuggestions([]);
      return;
    }
    
    // Check for final matrix generation message by content, not by message count
    // This is more reliable than using a fixed message length
    if (latestQuestion.includes("enough information to create a marketing strategy matrix") || 
        latestQuestion.includes("marketing strategy matrix for your fitness business")) {
      console.log("📱 [CLIENT] Skipping suggestions for final matrix generation message");
      setAiSuggestions([]);
      return;
    }
    
    // Use hardcoded suggestions for business type question (third question)
    if (questionNumber === 2) {
      console.log("📱 [CLIENT] Using hardcoded suggestions for business type question");
      setAiSuggestions([
        "Hybrid Coaching (both in person and online training)",
        "Fitness class instructor",
        "Wellness Coach"
      ]);
      setIsLoadingSuggestions(false);
      // Scroll down after suggestions are set
      setTimeout(() => scrollToBottom(), 100);
      return;
    }
    
    // Add specific suggestions for competitor question
    if (latestQuestion.includes("top 2-3 competitors") || 
        (latestQuestion.includes("competitors") && latestQuestion.includes("marketing approach"))) {
      console.log("📱 [CLIENT] Using custom suggestions for competitor question");
      setAiSuggestions([
        "CrossFit gyms focus on community, but lack personalized nutrition guidance",
        "Local boutique studios have stylish marketing but high prices, while I offer better value",
        "Planet Fitness attracts beginners, but I provide more hands-on coaching"
      ]);
      setIsLoadingSuggestions(false);
      // Scroll down after suggestions are set
      setTimeout(() => scrollToBottom(), 100);
      return;
    }
    
    setIsLoadingSuggestions(true);
    console.log("📱 [CLIENT] Starting to generate suggestions for question #", questionNumber);
    
    try {
      console.log("📱 [CLIENT] Question content:", latestQuestion);
      
      // Extract previous user answers from messages
      const previousAnswers = [];
      for (let i = 1; i < messages.length; i += 2) {
        if (messages[i] && messages[i].sender === 'user') {
          previousAnswers.push(messages[i].text);
        }
      }
      
      console.log("📱 [CLIENT] Previous answers collected:", previousAnswers);
      const businessContext = previousAnswers.length > 0 ? previousAnswers[0] : "fitness business";
      console.log("📱 [CLIENT] Business context:", businessContext);
      
      // Call API to generate suggestions with explicit question number
      console.log("📱 [CLIENT] Calling suggestion API with questionIndex:", questionNumber);
      const requestBody = {
        question: latestQuestion,
        businessContext: businessContext,
        previousAnswers: previousAnswers,
        questionIndex: questionNumber
      };
      console.log("📱 [CLIENT] Request body:", JSON.stringify(requestBody));
      
      const response = await fetch('/api/strategy/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("📱 [CLIENT] API response status:", response.status);
      if (!response.ok) {
        console.error("📱 [CLIENT] API error", response.status);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📱 [CLIENT] Received API response data:", data);
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        console.log("📱 [CLIENT] Valid suggestions received, count:", data.suggestions.length);
        setAiSuggestions(data.suggestions);
        // Scroll down after suggestions are loaded
        setTimeout(() => scrollToBottom(), 200);
      } else {
        console.error("📱 [CLIENT] Invalid suggestions format:", data);
        throw new Error('Invalid suggestions format');
      }
    } catch (error) {
      console.error('📱 [CLIENT] Error generating suggestions:', error);
      // Provide fallback suggestions based on question context
      console.log("📱 [CLIENT] Using fallback suggestions for question index:", questionNumber);
      const fallbackSuggestions = generateFallbackSuggestions(latestQuestion, questionNumber);
      console.log("📱 [CLIENT] Fallback suggestions:", fallbackSuggestions);
      setAiSuggestions(fallbackSuggestions);
      // Scroll down after fallback suggestions are set
      setTimeout(() => scrollToBottom(), 200);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Update the fallback suggestions to be more action-oriented
  const generateFallbackSuggestions = (question, questionIndex) => {
    // First check if this is the challenges question (which appears at different indices depending on flow)
    if (question.includes("biggest challenge") || 
        question.includes("attracting or retaining clients")) {
      return [
        "Finding new clients in a saturated market with many competing fitness options",
        "Converting initial interest into long-term membership commitments",
        "Building a consistent social media presence that connects with my target audience",
        "Differentiating my services from lower-priced fitness apps and online programs"
      ];
    }

    const fallbacks = {
      1: [ // Business type
        "Hybrid Coaching (both in person and online training)",
        "Fitness class instructor",
        "Wellness Coach"
      ],
      2: [ // Target audience - improved
        "Busy professionals (30-45) seeking efficient, high-impact workouts",
        "Active adults (50+) focused on maintaining mobility and strength",
        "Fitness newcomers looking for supportive, beginner-friendly guidance"
      ],
      3: [ // Marketing objectives (now action-focused)
        "Get potential clients to book a free consultation call",
        "Encourage followers to sign up for weekly fitness classes",
        "Motivate existing clients to refer friends and family"
      ],
      4: [ // Unique approach
        "Evidence-based training combining strength and mobility",
        "Supportive community where clients become accountability partners",
        "Specialized expertise in nutrition alongside fitness"
      ],
      5: [ // Content creation
        "Short videos demonstrating exercises and quick tips",
        "Before/after transformations with client testimonials",
        "Educational content about fitness myths and science"
      ],
      // Default fallback for any other question index
      default: [
        "Specific details about your fitness approach",
        "Your unique market positioning",
        "What resonates with your target clients"
      ]
    };
    
    return fallbacks[questionIndex] || fallbacks.default;
  };

  // Update the handleSuggestionSelect function 
  const handleSuggestionSelect = (suggestion) => {
    setCurrentInput(suggestion);
    // Submit automatically after a brief delay
    setTimeout(() => {
      // Create a mock form submit event
      handleSubmit({ preventDefault: () => {} });
    }, 800);
  };

  // Add the suggestion click handler for feedback popup
  const handleSuggestionClick = (suggestion) => {
    const updatedMatrix = { ...matrix };
    
    // Handle different sections
    if (feedbackPopup.section === 'audience') {
      // Update audience segment name
      updatedMatrix.enhancedStrategy.audiences[feedbackPopup.index].segment = suggestion;
    } else {
      // Original functionality for other sections
      updatedMatrix[feedbackPopup.section][feedbackPopup.index] = suggestion;
    }
    
    setMatrix(updatedMatrix);
    
    // Close the popup
    setFeedbackPopup({
      visible: false,
      section: '',
      index: null,
      text: '',
      currentValue: ''
    });
  };

  // Add this function to handle aesthetic input changes
  const handleAestheticChange = (e) => {
    setAestheticModal({
      ...aestheticModal,
      value: e.target.value
    });
  };

  // Add this function to handle form submission
  const handleAestheticSubmit = async (aestheticValue) => {
    const valueToUse = aestheticValue || aestheticModal.value;
    
    if (!valueToUse.trim()) return;
    
    try {
      // First save the strategy if needed
      let savedStrategyId = strategyId;
      
      if (!savedStrategyId) {
        toast.loading('Saving strategy first...');
        savedStrategyId = await handleSaveStrategy();
        if (!savedStrategyId) {
          toast.error('Failed to save strategy. Please try again.');
          return;
        }
      }
      
      // Wait a moment to ensure the strategy is saved
      toast.loading('Preparing content outline...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the strategy ID in localStorage as a backup
      localStorage.setItem('lastStrategyId', savedStrategyId);
      
      // Navigate directly to content outline with the strategy ID and aesthetic parameter
      console.log(`Navigating to content/new with strategy ID: ${savedStrategyId}`);
      router.push(`/content/new?strategy=${savedStrategyId}&aesthetic=${encodeURIComponent(valueToUse)}`);
    } catch (error) {
      console.error('Error handling aesthetic submission:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  // --- Corrected MatrixDisplay Component Definition ---
  const MatrixDisplay = ({ matrix, onSave, onEdit }) => {
    console.log("Rendering MatrixDisplay, matrix.error:", matrix?.error);

    // Check for error state first
    if (matrix.error) {
      return (
        <div className={`${styles.matrixContainer} ${styles.errorState}`}>
          <h2>Strategy Generation Failed</h2>
          <p>We encountered an error while generating the strategy:</p>
          <pre className={styles.errorMessage}>{matrix.errorMessage}</pre>
          <p>Please try adjusting your inputs or contact support if the issue persists.</p>
          {/* Button is NOT rendered here in the error case */}
        </div>
      );
    }

    // Check if we have the enhanced matrix structure (or basic)
    const hasEnhancedData = matrix.enhancedStrategy && matrix.enhancedStrategy.audiences;
    const targetAudience = hasEnhancedData ? matrix.enhancedStrategy.audiences.map(a => a.segment) : matrix.targetAudience;
    const objectives = hasEnhancedData ? matrix.enhancedStrategy.audiences.map(a => a.objectives.map(o => o.objective)) : [matrix.objectives]; // Wrap basic objectives
    const keyMessages = hasEnhancedData ? matrix.enhancedStrategy.audiences.map(a => a.keyMessages) : [matrix.keyMessages]; // Wrap basic messages

    // Ensure we always have arrays even if data is missing/malformed
    const audiences = Array.isArray(targetAudience) ? targetAudience : [];
    const objectivesList = Array.isArray(objectives) ? objectives : [];
    const messagesList = Array.isArray(keyMessages) ? keyMessages : [];

    return (
      <div className={styles.matrixContainer}>
        <h2>Marketing Strategy Matrix</h2>
        <p className={styles.matrixIntro}>
          Here is the generated strategy based on your input. Review the details below. You can click on items to refine them if needed (audience regeneration available, others are direct edits for now).
        </p>

        <div className={styles.matrixGrid}>
          {/* Column Headers */}
          <div className={`${styles.matrixCell} ${styles.headerCell}`}>Target Audience</div>
          <div className={`${styles.matrixCell} ${styles.headerCell}`}>Objectives</div>
          <div className={`${styles.matrixCell} ${styles.headerCell}`}>Key Messages</div>

          {/* Render rows based on audience segments */}
          {audiences.map((audience, audienceIndex) => (
            <React.Fragment key={`audience-${audienceIndex}`}>
              {/* Audience Cell */}
              <div className={`${styles.matrixCell} ${styles.audienceCell}`}>
                <span
                  onClick={() => hasEnhancedData ? onEdit('audience', audienceIndex, audience) : null}
                  className={hasEnhancedData ? styles.interactiveCell : ''}
                >
                  {audience || 'N/A'}
                </span>
              </div>

              {/* Objectives Cell (List) */}
              <div className={`${styles.matrixCell} ${styles.objectivesCell}`}>
                <ul>
                  {(objectivesList[audienceIndex] || []).map((obj, objectiveIndex) => (
                    <li
                      key={`obj-${audienceIndex}-${objectiveIndex}`}
                      onClick={() => hasEnhancedData ? onEdit('objective', audienceIndex, objectiveIndex, obj) : null}
                       className={hasEnhancedData ? styles.interactiveCell : ''}
                    >
                      {typeof obj === 'string' ? obj : obj.objective || 'N/A'}
                    </li>
                  ))}
                  {(!objectivesList[audienceIndex] || objectivesList[audienceIndex].length === 0) && <li>N/A</li>}
                </ul>
              </div>

              {/* Key Messages Cell (List) */}
              <div className={`${styles.matrixCell} ${styles.messagesCell}`}>
                <ul>
                  {(messagesList[audienceIndex] || []).map((msg, messageIndex) => (
                    <li
                      key={`msg-${audienceIndex}-${messageIndex}`}
                      onClick={() => hasEnhancedData ? onEdit('keyMessage', audienceIndex, messageIndex, msg) : null}
                       className={hasEnhancedData ? styles.interactiveCell : ''}
                    >
                      {msg || 'N/A'}
                    </li>
                  ))}
                  {(!messagesList[audienceIndex] || messagesList[audienceIndex].length === 0) && <li>N/A</li>}
                </ul>
              </div>
            </React.Fragment>
          ))}

          {/* Fallback if no audiences */} 
          {audiences.length === 0 && (
            <>
              <div className={styles.matrixCell}>No Audience Data</div>
              <div className={styles.matrixCell}>No Objectives Data</div>
              <div className={styles.matrixCell}>No Key Messages Data</div>
            </>
          )}
        </div>

        {/* Save Button - Placed correctly inside the component */}
        <button onClick={onSave} className={styles.saveButton}>
          Save & Finish Strategy
        </button>
      </div>
    );
  };

  // Add this component for visual aesthetic selection
  const AestheticSelectionModal = ({ isOpen, onClose, onSelect, selectedValue }) => {
    const aestheticOptions = [
      {
        id: 'professional',
        name: 'Professional & Educational',
        description: 'Expert-driven content with an emphasis on knowledge and credibility',
      },
      {
        id: 'motivational',
        name: 'Motivational & Energetic',
        description: 'High-energy content focused on inspiration and motivation',
      },
      {
        id: 'community',
        name: 'Community & Supportive',
        description: 'Warm, inclusive content that emphasizes connection and belonging',
      },
      {
        id: 'premium',
        name: 'Premium & Exclusive',
        description: 'Sophisticated content highlighting premium quality and exclusivity',
      },
      {
        id: 'authentic',
        name: 'Authentic & Raw',
        description: 'Real, unfiltered content showcasing genuine moments and transformations',
      },
      {
        id: 'custom',
        name: 'Custom Style',
        description: 'Describe your own unique aesthetic',
      }
    ];
    
    const [customAesthetic, setCustomAesthetic] = useState('');
    const [selected, setSelected] = useState(selectedValue || '');
    
    if (!isOpen) return null;
    
    const handleSelect = (aestheticId) => {
      setSelected(aestheticId);
      if (aestheticId !== 'custom') {
        const option = aestheticOptions.find(o => o.id === aestheticId);
        onSelect(option.name);
      }
    };
    
    const handleCustomSubmit = () => {
      if (customAesthetic.trim()) {
        onSelect(customAesthetic);
      }
    };
    
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.aestheticModal}>
          <div className={styles.modalHeader}>
            <h3>Select Your Content Aesthetic</h3>
            <button 
              className={styles.closeButton}
              onClick={onClose}
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
                  className={`${styles.aestheticCard} ${selected === option.id ? styles.selectedAesthetic : ''}`}
                  onClick={() => handleSelect(option.id)}
                >
                  <div className={styles.aestheticInfo}>
                    <h4>{option.name}</h4>
                    <p>{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selected === 'custom' && (
              <div className={styles.customAestheticInput}>
                <label htmlFor="customAesthetic">Describe your preferred content style:</label>
                <input
                  type="text"
                  placeholder="Describe your custom aesthetic style..."
                  value={customAesthetic}
                  onChange={(e) => setCustomAesthetic(e.target.value)}
                  className={styles.customInput}
                />
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={onClose} 
                    className={styles.cancelButton}
                    style={{
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      transition: 'all 0.2s ease',
                      margin: '0 5px'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCustomSubmit} 
                    className={styles.saveButton}
                    disabled={!customAesthetic.trim()}
                    style={{
                      backgroundColor: '#3454D1',
                      color: 'white',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease',
                      margin: '0 5px'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- NEW: Handler for Modal Continue Button ---
  const handleModalContinue = () => {
    setShowSuccessModal(false);
    router.push('/marketing-plan'); // Redirect back to the dashboard
  };

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Create New Strategy | Mark1</title>
        <meta name="description" content="Create a new marketing strategy" />
      </Head>
      
      {/* --- NEW: Header Bar --- */}
      <header className={styles.strategyHeader}>
        <Link href="/marketing-plan" className={styles.backButton}>
          &larr; Back to Dashboard
        </Link>
        <div className={styles.headerTitles}>
          <h1 className={styles.pageTitle}>Mark1 - Strategy Creation</h1>
          {currentProject && (
            <span className={styles.projectName}>Project: {currentProject.name}</span>
          )}
        </div>
        <div className={styles.headerActions}> {/* Placeholder for potential future actions */} </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.content}>
          {!showMatrix ? (
            // Chat UI - Only show when matrix is not visible
            <div className={styles.chatLayout}>
              <div className={styles.chatContainer}>
                <div className={styles.messages}>
                  {messages.map((message, index) => (
                    <div key={index} className={`${styles.message} ${styles[message.sender]}`}>
                      {message.sender === 'assistant' && (
                        <div className={styles.avatarContainer}>
                          <div className={styles.avatar}>AI</div>
                        </div>
                      )}
                      <div className={styles.messageContent}>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className={`${styles.message} ${styles.assistant}`}>
                      <div className={styles.avatarContainer}>
                        <div className={styles.avatar}>AI</div>
                      </div>
                      <div className={styles.messageContent}>
                        <div className={styles.typing}>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className={styles.suggestedAnswers}>
                  {suggestions.length > 0 && 
                   !messages[messages.length-1]?.text.includes("building your marketing strategy") &&
                   !messages[messages.length-1]?.text.includes("enough information to create a marketing strategy matrix") && (
                    <h4 className={styles.suggestionsTitle}>Example Answers</h4>
                  )}
                  {suggestions.length > 0 && 
                   !messages[messages.length-1]?.text.includes("building your marketing strategy") &&
                   !messages[messages.length-1]?.text.includes("enough information to create a marketing strategy matrix") && 
                    suggestions.map((suggestion, index) => (
                      <button 
                        key={index}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className={styles.suggestionChip}
                        disabled={isProcessing}
                      >
                        {suggestion}
                      </button>
                    ))
                  }
                </div>
                
                {aiSuggestions.length > 0 && 
                 currentQuestionIndex > 0 && 
                 !messages[messages.length-1]?.text.includes("building your marketing strategy") &&
                 !messages[messages.length-1]?.text.includes("enough information to create a marketing strategy matrix") && (
                  <div className={styles.aiSuggestionsContainer}>
                    {isLoadingSuggestions ? (
                      <div className={styles.loadingSpinner}></div>
                    ) : (
                      <div className={styles.aiSuggestionsRow}>
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={styles.aiSuggestionPill}
                            title={suggestion}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className={styles.inputForm}>
                  <input
                    type="text"
                    ref={chatInputRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={isProcessing}
                    className={styles.chatInput}
                  />
                  <button 
                    type="submit" 
                    disabled={isProcessing || !currentInput.trim()}
                    className={styles.sendButton}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Matrix UI - Render MatrixDisplay directly
            <MatrixDisplay matrix={matrix} onSave={handleSaveStrategy} onEdit={handleCellClick} />
          )}
        </div>
      </main>
      
      {/* --- NEW: Success Modal --- */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <h2 className={styles.modalTitle}>Strategy Created!</h2>
            <p className={styles.modalMessage}>
              Strategy created successfully! Next, create your Content Outline.
            </p>
            <button
              onClick={handleModalContinue}
              className={styles.modalButton}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Popup */}
      {feedbackPopup.visible && (
        <div className={styles.modalOverlay}>
          <div className={styles.feedbackModal}>
            <div className={styles.modalHeader}>
              <h3>Add Feedback and Regenerate</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setFeedbackPopup({...feedbackPopup, visible: false})}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.currentValue}>
                <strong>
                  {feedbackPopup.section === 'audience' ? 'Current Audience Segment:' : 
                   feedbackPopup.section === 'objective' ? 'Current Objective:' : 
                   feedbackPopup.section === 'keyMessage' ? 'Current Key Message:' : 
                   'Current Value:'}
                </strong>
                <p>{feedbackPopup.currentValue}</p>
              </div>
              
              <div className={styles.feedbackInputContainer}>
                <label htmlFor="feedback">
                  {feedbackPopup.section === 'audience' 
                    ? "Please provide specific feedback on what you'd like to change or improve:" 
                    : feedbackPopup.section === 'objective'
                      ? "Edit this objective:"
                      : "Edit this key message:"}
                </label>
                <textarea
                  id="feedback"
                  ref={feedbackInputRef}
                  value={feedbackPopup.text}
                  onChange={handleFeedbackChange}
                  placeholder={
                    feedbackPopup.section === 'audience' 
                      ? "For example: Make this audience more specific, focus on a different age group, add more detail about their lifestyle..." 
                      : feedbackPopup.section === 'objective'
                        ? "Enter your updated objective here..."
                        : "Enter your updated key message here..."
                  }
                  className={styles.feedbackTextarea}
                />
              </div>
              
              <div className={styles.modalFooter}>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setFeedbackPopup({...feedbackPopup, visible: false})}
                  style={{
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    transition: 'all 0.2s ease',
                    margin: '0 5px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveFeedback}
                  className={styles.saveButton}
                  disabled={!feedbackPopup.text.trim() || (feedbackPopup.section === 'audience' && regeneratingAudience !== null)}
                  style={{
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    border: 'none',
                    boxShadow: 'none',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    margin: '0 5px'
                  }}
                >
                  {feedbackPopup.section === 'audience' ? 'Regenerate Audience' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic Modal */}
      <AestheticSelectionModal 
        isOpen={aestheticModal.visible}
        onClose={() => setAestheticModal({...aestheticModal, visible: false})}
        onSelect={(value) => {
          setAestheticModal({value: value, visible: false});
          handleAestheticSubmit(value);
        }}
        selectedValue={aestheticModal.value}
      />

      {process.env.NODE_ENV !== 'production' && (
        <div className={styles.diagnosticTools}>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/strategy/test-gemini');
                const data = await response.json();
                console.log("Gemini API Test Result:", data);
                alert(data.success ? "API Test Successful: " + data.response : "API Test Failed: " + data.error);
              } catch (e) {
                console.error("Test failed:", e);
                alert("API Test Error: " + e.message);
              }
            }}
            className={styles.diagnosticButton}
          >
            Test Gemini API
          </button>
        </div>
      )}
    </div>
  );
} 