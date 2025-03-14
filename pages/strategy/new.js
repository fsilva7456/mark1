import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Strategy.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function NewStrategy() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    answers: []
  });
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrix, setMatrix] = useState({
    targetAudience: [],
    objectives: [],
    keyMessages: []
  });
  
  // Feedback popup state
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
  
  const { user } = useAuth();
  
  // Replace the AI suggestions code with this modified version that works with the chat flow
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Track current question in a different way
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    // Add a small delay to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
      console.log("Using hardcoded response flow, message count:", messages.length);
      
      // Initial greeting - first message
      if (isInitial) {
        return "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?";
      }
      
      // Second message - after user provides name
      if (messages.length === 1) {
        const name = userInput.trim();
        return `Great to meet you, ${name}! I'd like to understand more about your fitness business. What type of fitness services do you offer? For example, are you a personal trainer, run a gym, or offer specialized classes?`;
      }
      
      // Third message - after user describes business
      if (messages.length === 3) {
        return `Thanks for sharing that information about your fitness business. Now I'd like to understand your target audience better. Who are your ideal clients? Consider factors like age range, fitness goals, and any specific demographics you currently serve or would like to attract.`;
      }
      
      // Fourth message - after user describes target audience
      if (messages.length === 5) {
        return `Great! Now let's focus on your marketing goals. What are your top marketing objectives for the next few months? For example, are you looking to increase client retention, attract new clients, launch a new service, or increase your social media presence?`;
      }
      
      // Fifth message - after user describes marketing goals
      if (messages.length === 7) {
        return `Thanks for sharing your goals. Now, what makes your fitness approach unique compared to others in your area? What's your unique selling proposition or competitive advantage?`;
      }
      
      // Sixth message - after user describes unique approach
      if (messages.length === 9) {
        return `That's really helpful! Now, let's talk about content creation. What types of content do you feel most comfortable creating? For example, videos, photos, written posts, social media stories, etc.`;
      }
      
      // Seventh message - after user describes content preferences
      if (messages.length === 11) {
        return `Perfect! I now have enough information to create a marketing strategy matrix for your fitness business. This will serve as the foundation for your marketing efforts. [READY_FOR_MATRIX]`;
      }
      
      // Fallback for any other message count
      return `Thanks for that information! I'm building your marketing strategy. Could you tell me more about your ideal client journey - from how they first hear about you to becoming a loyal customer?`;
      
    } catch (error) {
      console.error('Error in hardcoded response flow:', error);
      
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
      const name = userAnswers[0] || 'User';
      const business = userAnswers[1] || 'fitness business';
      const audience = userAnswers[2] || 'fitness enthusiasts';
      const goals = userAnswers[3] || 'attract new clients';
      const unique = userAnswers[4] || 'personalized approach';
      const content = userAnswers[5] || 'various content types';
      
      // Fetch gym data to inform the strategy - add more logging
      console.log("DEBUG: Starting to fetch gym data for strategy generation...");
      const gymData = await fetchCompetitiveInsights('Downtown Toronto');
      console.log("DEBUG: Gym data fetch result:", gymData ? `${gymData.length} records` : "no data", gymData);
      
      if (gymData && gymData.length > 0) {
        console.log("DEBUG: Gym data available, calling generate enhanced strategy");
        // Send all data to Gemini for analysis and enhanced strategy generation
        const enhancedStrategy = await generateEnhancedStrategy(
          name, business, audience, goals, unique, content, gymData
        );
        
        console.log("DEBUG: Enhanced strategy result:", enhancedStrategy ? "success" : "failed");
        
        if (enhancedStrategy) {
          // Set the matrix state with Gemini's enhanced strategy
          console.log("DEBUG: Using Gemini-generated strategy");
          setMatrix(enhancedStrategy);
          setShowMatrix(true);
          setIsProcessing(false);
          return;
        } else {
          console.log("DEBUG: Enhanced strategy generation failed, falling back to hardcoded");
        }
      } else {
        console.log("DEBUG: No gym data available, falling back to hardcoded strategy");
      }
      
      // Fallback to basic strategy generation if gym data fetch fails or is empty
      console.log("Using fallback strategy generation without gym data");
      
      // Generate audience segments based on answers
      const targetAudience = [
        `${audience.includes(',') ? audience.split(',')[0] : audience} seeking personalized fitness solutions`,
        `Busy professionals looking for ${business.toLowerCase().includes('personal') ? 'efficient personal training' : 'effective workout options'}`,
        `${audience.includes('beginners') ? 'Beginners starting their fitness journey' : 'Fitness enthusiasts wanting to reach new goals'}`
      ];
      
      // Generate objectives based on goals
      const objectives = [
        `${goals.toLowerCase().includes('client') ? 'Attract new clients through targeted marketing' : 'Increase brand visibility in the local fitness market'}`,
        `Build a reputation as a trusted ${business.toLowerCase().includes('train') ? 'trainer' : 'fitness provider'} through consistent content`,
        `${goals.toLowerCase().includes('social') ? 'Grow social media following by 30% in 3 months' : 'Convert prospects to paying clients through effective messaging'}`
      ];
      
      // Generate key messages based on unique selling points
      const keyMessages = [
        `Experience ${unique.toLowerCase().includes('personal') ? 'truly personalized fitness guidance' : 'a fitness approach tailored to your needs'}`,
        `Achieve your goals faster with our proven ${business.toLowerCase().includes('train') ? 'training methods' : 'fitness systems'}`,
        `Join a supportive community that helps you stay accountable and motivated`
      ];
      
      // Set the matrix state
      setMatrix({
        targetAudience,
        objectives,
        keyMessages
      });
      
      // Show the matrix view
      setShowMatrix(true);
      
    } catch (error) {
      console.error('Error generating matrix:', error);
      
      // Fallback matrix if there's an error
      const fallbackMatrix = {
        targetAudience: [
          `Fitness enthusiasts looking for personalized training`,
          `Busy professionals seeking efficient workouts`,
          `Beginners interested in starting their fitness journey`
        ],
        objectives: [
          `Increase social media engagement by 30%`,
          `Build a reputation as a trusted voice in fitness`,
          `Convert followers to paying clients`
        ],
        keyMessages: [
          `Achieve real results with personalized guidance`,
          `Transform your fitness journey with expert support`,
          `Join a supportive community that helps you reach your goals`
        ]
      };
      
      setMatrix(fallbackMatrix);
      setShowMatrix(true);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Update generateEnhancedStrategy with better error handling
  const generateEnhancedStrategy = async (name, business, audience, goals, unique, content, gymData) => {
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
                business,
                audience,
                goals,
                unique,
                content
              },
              gymData: formattedGymData
            }),
            // Add timeout to prevent hanging requests
            timeout: 20000
          });
          
          if (!response.ok) {
            console.error(`DEBUG: API request failed with status ${response.status}`);
            continue; // Try again
          }
          
          const data = await response.json();
          
          // Validate the matrix structure
          if (data.matrix && 
              data.matrix.targetAudience && 
              data.matrix.objectives && 
              data.matrix.keyMessages &&
              data.matrix.targetAudience.length === 3 &&
              data.matrix.objectives.length === 3 &&
              data.matrix.keyMessages.length === 3) {
            
            console.log("DEBUG: Valid matrix structure received from API");
            matrix = data.matrix;
          } else {
            console.error("DEBUG: Invalid matrix structure received:", data);
          }
        } catch (apiError) {
          console.error(`DEBUG: API call error on attempt ${attempts}:`, apiError);
        }
      }
      
      // If we still don't have a valid matrix after all attempts, create one
      if (!matrix) {
        console.log("DEBUG: Creating fallback matrix after failed API attempts");
        matrix = {
          targetAudience: [
            `${audience} seeking personalized fitness solutions`,
            `Busy professionals looking for efficient workout options`,
            `${audience.includes('beginners') ? 'Beginners starting their fitness journey' : 'Fitness enthusiasts wanting to reach new goals'}`
          ],
          objectives: [
            `${goals.toLowerCase().includes('client') ? 'Attract new clients through targeted marketing' : 'Increase brand visibility in the local fitness market'}`,
            `Build a reputation as a trusted ${business.toLowerCase().includes('train') ? 'trainer' : 'fitness provider'} through consistent content`,
            `${goals.toLowerCase().includes('social') ? 'Grow social media following by 30% in 3 months' : 'Convert prospects to paying clients through effective messaging'}`
          ],
          keyMessages: [
            `Experience ${unique.toLowerCase().includes('personal') ? 'truly personalized fitness guidance' : 'a fitness approach tailored to your needs'}`,
            `Achieve your goals faster with our proven ${business.toLowerCase().includes('train') ? 'training methods' : 'fitness systems'}`,
            `Join a supportive community that helps you stay accountable and motivated`
          ]
        };
      }
      
      return matrix;
      
    } catch (error) {
      console.error("DEBUG: Error in enhance strategy generation:", error);
      return null;
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
    setUserData(prev => ({
      ...prev,
      name: messages.length === 1 ? currentInput : prev.name,
      answers: [...prev.answers, currentInput]
    }));
    
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
        
        // Scroll to bottom after AI response
        scrollToBottom();
        
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
        
        // Scroll to bottom after AI response
        scrollToBottom();
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
    try {
      setIsProcessing(true);
      
      // Extract the user name and business description from userData
      const name = userData.name || 'User';
      const businessDescription = userData.answers && userData.answers.length > 1 
        ? userData.answers[1] 
        : "Fitness business";
      
      // Create a UUID explicitly for the strategy if needed
      const strategyId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('strategies')
        .insert([
          {
            id: strategyId,
            name: `${name}'s Marketing Strategy`,
            user_id: user.id,
            business_description: businessDescription,
            target_audience: matrix.targetAudience,
            objectives: matrix.objectives,
            key_messages: matrix.keyMessages,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update strategy ID state with the UUID
      setStrategyId(strategyId);
      
      toast.success('Strategy saved successfully!');
      
      router.push(`/strategy/view/${strategyId}`);
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save your strategy. Please try again.');
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
    // In a real app, this would call an AI API to get suggestions
    // For now, we'll create contextual mock suggestions
    
    const mockSuggestions = {
      targetAudience: [
        `${userData.business} enthusiasts aged 25-50 focused on ${input ? input.toLowerCase() : 'health goals'}`,
        `Fitness ${input ? input.toLowerCase() + ' seekers' : 'beginners'} looking for personalized guidance`,
        `Health-conscious individuals interested in ${userData.business?.toLowerCase().includes('personal') ? 'one-on-one training' : 'group fitness classes'}`
      ],
      objectives: [
        `${input ? 'Boost ' + input.toLowerCase() : 'Grow your audience'} by creating consistent weekly content`,
        `Establish ${userData.name} as a thought leader in ${input ? input.toLowerCase() : 'fitness'}`,
        `Generate ${input ? input.toLowerCase() + ' leads' : 'qualified leads'} through strategic calls-to-action`
      ],
      keyMessages: [
        `${input ? 'Our ' + input.toLowerCase() : 'Our approach'} delivers results other programs can't match`,
        `Discover how ${userData.name}'s method ${input ? 'focuses on ' + input.toLowerCase() : 'transforms your fitness'}`,
        `Experience the difference of ${input ? input.toLowerCase() + ' training' : 'personalized training'} with our community`
      ]
    };
    
    setSuggestions(mockSuggestions[section] || []);
  };
  
  const handleSaveFeedback = () => {
    // Update the matrix with new value
    if (feedbackPopup.text.trim()) {
      const updatedMatrix = { ...matrix };
      updatedMatrix[feedbackPopup.section][feedbackPopup.index] = feedbackPopup.text;
      setMatrix(updatedMatrix);
    }
    
    // Close the popup
    setFeedbackPopup({
      visible: false,
      section: '',
      index: null,
      text: '',
      currentValue: ''
    });
  };
  
  const handleSuggestionClick = (suggestion) => {
    const updatedMatrix = { ...matrix };
    updatedMatrix[feedbackPopup.section][feedbackPopup.index] = suggestion;
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

  // Add this effect to monitor messages and update current question index
  useEffect(() => {
    // Update current question index based on message count
    // First message is AI greeting, then alternates between user and AI
    const userMessageCount = Math.floor(messages.length / 2);
    setCurrentQuestionIndex(userMessageCount);
    
    // Generate suggestions whenever the AI asks a new question (odd-numbered messages)
    if (messages.length > 0 && messages.length % 2 === 1 && messages.length > 1) {
      generateAISuggestionsForChat(messages[messages.length - 1].text);
    }
  }, [messages]);

  // Modified function to work with chat interface
  const generateAISuggestionsForChat = async (latestQuestion) => {
    // Skip generating suggestions for name question (first question)
    if (currentQuestionIndex === 0) {
      setAiSuggestions([]);
      return;
    }
    
    setIsLoadingSuggestions(true);
    
    try {
      // Extract previous user answers from messages
      const previousAnswers = [];
      for (let i = 1; i < messages.length; i += 2) {
        if (messages[i] && messages[i].sender === 'user') {
          previousAnswers.push(messages[i].text);
        }
      }
      
      const businessContext = previousAnswers.length > 1 ? previousAnswers[1] : "fitness business";
      
      const response = await fetch('/api/strategy/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: latestQuestion,
          businessContext: businessContext,
          previousAnswers: previousAnswers,
          questionIndex: currentQuestionIndex
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
      } else {
        throw new Error('Invalid suggestions format');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Provide fallback suggestions
      setAiSuggestions([
        "Sorry, couldn't generate suggestions at this time.",
        "Please try again or proceed with your own answer.",
        "You can refresh the page if the problem persists."
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Create New Strategy | Mark1</title>
        <meta name="description" content="Create a new marketing strategy for your fitness business" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Create a New Marketing Strategy</h1>
            <p>Our AI assistant will help you build a customized marketing strategy for your fitness business.</p>
          </div>
        </div>

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
                  {suggestions.length > 0 && (
                    <h4 className={styles.suggestionsTitle}>Example Answers</h4>
                  )}
                  {suggestions.map((suggestion, index) => (
                    <button 
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={styles.suggestionChip}
                      disabled={isProcessing}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                
                {aiSuggestions.length > 0 && currentQuestionIndex > 0 && (
                  <div className={styles.aiSuggestionsContainer}>
                    <h3>Suggestions:</h3>
                    {isLoadingSuggestions ? (
                      <div className={styles.loadingSpinner}></div>
                    ) : (
                      <div className={styles.aiSuggestionsList}>
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={styles.aiSuggestionButton}
                          >
                            {suggestion.length > 100 ? suggestion.substring(0, 100) + '...' : suggestion}
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
            // Matrix UI - Only show when matrix is visible
            <div className={styles.matrixLayout}>
              <div className={styles.matrixContainer}>
                <h2>Your Marketing Strategy</h2>
                <div className={styles.matrix}>
                  <div className={styles.matrixColumn}>
                    <h3>Target Audience</h3>
                    <ul>
                      {matrix.targetAudience.map((item, index) => (
                        <li 
                          key={index} 
                          onClick={() => handleCellClick('targetAudience', index, item)}
                          className={styles.interactiveCell}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.matrixColumn}>
                    <h3>Objectives</h3>
                    <ul>
                      {matrix.objectives.map((item, index) => (
                        <li 
                          key={index} 
                          onClick={() => handleCellClick('objectives', index, item)}
                          className={styles.interactiveCell}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.matrixColumn}>
                    <h3>Key Messages</h3>
                    <ul>
                      {matrix.keyMessages.map((item, index) => (
                        <li 
                          key={index} 
                          onClick={() => handleCellClick('keyMessages', index, item)}
                          className={styles.interactiveCell}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className={styles.matrixActions}>
                  <button
                    onClick={handleSaveStrategy}
                    className={styles.saveButton}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Saving...' : 'Save Strategy'}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!strategyId) {
                        // First save the strategy, then navigate to content when successful
                        handleSaveStrategy().then(() => {
                          if (strategyId) {
                            router.push(`/content/new?strategy=${strategyId}`);
                          }
                        });
                      } else {
                        // Already saved, just navigate
                        router.push(`/content/new?strategy=${strategyId}`);
                      }
                    }}
                    className={styles.outlineButton}
                    disabled={isProcessing}
                  >
                    Generate Content Outline
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Feedback Popup */}
      {feedbackPopup.visible && (
        <div className={styles.modalOverlay}>
          <div className={styles.feedbackModal}>
            <div className={styles.modalHeader}>
              <h3>Refine Your Strategy</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setFeedbackPopup({...feedbackPopup, visible: false})}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.currentValue}>
                <strong>Current Value:</strong>
                <p>{feedbackPopup.currentValue}</p>
              </div>
              
              <div className={styles.feedbackInputContainer}>
                <label htmlFor="feedback">Your feedback:</label>
                <textarea
                  id="feedback"
                  ref={feedbackInputRef}
                  value={feedbackPopup.text}
                  onChange={handleFeedbackChange}
                  placeholder="Enter your customized text..."
                  className={styles.feedbackTextarea}
                />
                <button 
                  onClick={handleSaveFeedback}
                  className={styles.saveButton}
                  disabled={!feedbackPopup.text.trim()}
                >
                  Save Changes
                </button>
              </div>
              
              <div className={styles.suggestionsContainer}>
                <h4>AI Suggestions</h4>
                <div className={styles.suggestionsList}>
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index} 
                      className={styles.suggestionItem}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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