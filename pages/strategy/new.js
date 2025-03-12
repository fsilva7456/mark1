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
  
  // Completely revised sendToGemini function - fully dynamic
  const sendToGemini = async (userInput, isInitial = false) => {
    try {
      console.log("Sending to Gemini:", isInitial ? "Initial prompt" : userInput);
      
      // Prepare the full conversation context as a single prompt
      let prompt = `You are an AI marketing assistant for fitness professionals.
Your goal is to help the user create a 3x3 marketing strategy matrix with these components:
1. Target Audience (who they should market to)
2. Objectives (what they want to achieve)
3. Key Messages (what they should communicate)

You need to gather sufficient information to create this matrix by asking thoughtful, relevant questions.
Your questions should build on previous answers and help you understand the user's fitness business deeply.

To create an effective matrix, you'll need to understand:
- The nature of their fitness business (what services they offer)
- Their target audience and ideal clients
- Their business goals and marketing objectives
- What makes their approach unique compared to competitors
- Their content creation capabilities and preferences

${isInitial ? "START BY INTRODUCING YOURSELF AND ASKING FOR THE USER'S NAME." : ""}`;

      // Add conversation history in a clear format - only if we have messages
      if (messages.length > 0) {
        prompt += "\n\nCONVERSATION HISTORY:";
        messages.forEach(msg => {
          prompt += `\n\n${msg.sender === 'assistant' ? 'AI' : 'User'}: ${msg.text}`;
        });
      }
      
      // Add the current user input - only if not initial
      if (!isInitial && userInput) {
        prompt += `\n\nUser: ${userInput}`;
      }
      
      // Add instructions for the response
      prompt += `\n\nBased on this conversation:
1. Determine what information you still need to create the strategy matrix
2. Ask ONE targeted question to gather that information
3. Your response should be conversational and helpful
4. When you have enough information to create the strategy matrix, include [READY_FOR_MATRIX] at the end of your response
5. If you need competitor data, include [REQUEST_COMPETITOR_DATA:LOCATION] where LOCATION is the user's location

Your response:`;

      console.log("Prompt approach:", prompt.substring(0, 200) + "...");
      
      // Make direct call to Gemini API
      const response = await fetch('/api/strategy/generate-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          isDebugMode: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate response');
      }
      
      const data = await response.json();
      console.log("API response:", data);
      
      // Handle special commands
      if (data.showMatrix) {
        generateMatrix(userData);
        setShowMatrix(true);
      }
      
      if (data.requestCompetitorData && data.location) {
        const gymData = await fetchCompetitiveInsights(data.location);
        
        if (gymData && gymData.length > 0) {
          return await sendGymDataToGemini(gymData);
        }
      }
      
      return data.response;
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Provide a simple fallback that asks a generic question
      if (isInitial) {
        return "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?";
      }
      
      // Generic fallback questions based on previous message count
      return "I apologize for the technical difficulty. Let's continue with your strategy. Could you tell me more about your fitness business goals or what makes your approach unique?";
    }
  };
  
  // Function to send gym data to Gemini and get insights
  const sendGymDataToGemini = async (gymData) => {
    try {
      // Create a formatted representation of the gym data
      const gymDataString = gymData.map(gym => `
Gym: ${gym.name}
Offerings: ${gym.offerings || 'Not available'}
Positive feedback: ${gym.positives || 'Not available'}
Negative feedback: ${gym.negatives || 'Not available'}
Target audience: ${gym.targetAudience || 'Not available'}
Location: ${gym.location || 'Not available'}
Opportunities: ${gym.opportunities || 'Not available'}
`).join('\n---\n');

      // Build a prompt for analysis
      const prompt = `You are analyzing fitness business competitors to help create a marketing strategy.
      
COMPETITOR DATA:
${gymDataString}

Based on this competitor data, provide insights that would help the user develop their marketing strategy. Focus on:
1. Gaps in the market they could fill
2. How they could differentiate themselves
3. Target audiences that might be underserved

Present your insights in a helpful, conversational way. Don't mention that you're analyzing competitor data - just present your findings as expert advice.

After providing insights, ask a follow-up question to gather more information for the strategy matrix.`;

      // Make direct call to Gemini API
      const response = await fetch('/api/strategy/generate-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          isDebugMode: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze competitors');
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error analyzing competitors:', error);
      return "Based on my research of fitness businesses in your area, I've noticed there might be opportunities to differentiate yourself through specialized offerings. Could you tell me what makes your fitness approach unique compared to others?";
    }
  };
  
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
    
    // Store user data in a more general way
    // Just keep track of the first input as name for personalization
    if (messages.length === 1) {
      setUserData({
        ...userData,
        name: currentInput,
        answers: [...userData.answers, currentInput]
      });
    } else {
      setUserData({
        ...userData,
        answers: [...userData.answers, currentInput]
      });
    }
    
    // Process the user input with Gemini
    setIsProcessing(true);
    
    try {
      // Increase timeout for API call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), 20000);
      });
      
      // Race the API call against the timeout
      const response = await Promise.race([
        sendToGemini(currentInput),
        timeoutPromise
      ]);
      
      // Add AI response to chat
      setMessages([
        ...updatedMessages,
        {
          sender: 'assistant',
          text: response,
        }
      ]);
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Add a generic fallback message
      setMessages([
        ...updatedMessages,
        {
          sender: 'assistant',
          text: "I apologize for the technical difficulty. Let's continue with your strategy development. Could you tell me more about your fitness business or goals?",
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
  
  const generateMatrix = async (data) => {
    try {
      // Call Gemini to generate the matrix based on conversation
      const response = await fetch('/api/strategy/generate-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.sender === 'assistant' ? 'assistant' : 'user',
            content: msg.text
          })),
          userData: data
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate matrix');
      }
      
      const matrixData = await response.json();
      
      // Add final message from assistant
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Thanks for sharing all that information, ${data.name}! I've analyzed your responses and created a strategic marketing matrix for your fitness business. This will help guide your content strategy. Click on any cell to refine it with your feedback.`,
        }
      ]);
      
      setMatrix(matrixData.matrix);
      
    } catch (error) {
      console.error('Error generating matrix:', error);
      // Fallback to basic matrix if API fails
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
    </div>
  );
} 