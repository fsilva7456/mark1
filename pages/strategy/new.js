import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Strategy.module.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  
  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
  
  // Update the generateMatrix function to incorporate gym data insights
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
      
      // Fetch gym data to inform the strategy
      console.log("Fetching gym data to enhance strategy...");
      const gymData = await fetchCompetitiveInsights('Downtown Toronto');
      
      if (gymData && gymData.length > 0) {
        // Send all data to Gemini for analysis and enhanced strategy generation
        const enhancedStrategy = await generateEnhancedStrategy(
          name, business, audience, goals, unique, content, gymData
        );
        
        if (enhancedStrategy) {
          // Set the matrix state with Gemini's enhanced strategy
          setMatrix(enhancedStrategy);
          setShowMatrix(true);
          setIsProcessing(false);
          return;
        }
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
  
  // New function to generate enhanced strategy using Gemini and gym data
  const generateEnhancedStrategy = async (name, business, audience, goals, unique, content, gymData) => {
    try {
      console.log("Generating enhanced strategy with gym data insights...");
      
      // Format gym data for the API
      const formattedGymData = gymData.map(gym => ({
        name: gym.name,
        offerings: gym.offerings,
        positives: gym.positives,
        negatives: gym.negatives,
        targetAudience: gym.targetAudience,
        opportunities: gym.opportunities
      }));
      
      // Send request to a new API endpoint that will use Gemini to analyze the data
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
      });
      
      if (!response.ok) {
        console.error("Failed to generate enhanced strategy:", await response.text());
        return null;
      }
      
      const data = await response.json();
      return data.matrix;
      
    } catch (error) {
      console.error("Error generating enhanced strategy:", error);
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
    } finally {
      setIsProcessing(false);
    }
  };
  
  const fetchCompetitiveInsights = async (userLocation) => {
    try {
      // Get gyms near the user's location
      const response = await fetch(`/api/gyms/get-competitive-data?location=${userLocation}`);
      const { data } = await response.json();
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Use the gym data for Gemini prompting
      const competitiveInsights = data.map(gym => ({
        name: gym.Name,
        offerings: gym.Offerings, 
        positives: gym["What People Are Saying (Positive)"],
        negatives: gym["What People Are Saying (Negative)"],
        opportunities: gym["Insights/Opportunities/Suggestions for a Self-Employed Personal Trainer (In-Person & Online)"],
        targetAudience: gym["Primary Target Audience for Gym"],
        location: gym["Localized Location in Downtown Toronto"]
      }));
      
      return competitiveInsights;
    } catch (error) {
      console.error("Error fetching competitive insights:", error);
      return [];
    }
  };
  
  const handleSaveStrategy = async () => {
    try {
      // Save the strategy to Supabase
      const { data, error } = await supabase
        .from('strategies')
        .insert([
          { 
            user_id: user.id,
            name: `${userData.name}'s Marketing Strategy`,
            target_audience: matrix.targetAudience,
            objectives: matrix.objectives,
            key_messages: matrix.keyMessages,
            // Store original answers for context
            user_data: userData
          }
        ]);
      
      if (error) throw error;
      
      // Redirect to dashboard with success message
      router.push('/dashboard?success=strategy-created');
    } catch (error) {
      console.error('Error saving strategy:', error);
      // You could add error handling UI here
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
                  <button onClick={handleSaveStrategy} className={styles.saveButton}>
                    Save Strategy
                  </button>
                  <button 
                    onClick={() => router.push('/content/new?strategy=' + encodeURIComponent(`${userData.name}'s Marketing Strategy`))} 
                    className={styles.outlineButton}
                  >
                    Create Content Outline
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard')} 
                    className={styles.cancelButton}
                  >
                    Cancel
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