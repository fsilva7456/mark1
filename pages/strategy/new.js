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
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    name: '',
    business: '',
    answers: [],
  });
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrix, setMatrix] = useState({
    targetAudience: [],
    objectives: [],
    keyMessages: []
  });
  
  // New state for chat suggestions
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
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
  
  // Questions the AI will ask
  const questions = [
    "What's your name?",
    "Great to meet you! Tell me about your fitness business - what do you specialize in?",
    "What are your main business goals for the next 3 months?",
    "Who is your ideal client? Describe their demographics, interests, and pain points.",
    "What makes your fitness approach unique compared to competitors?",
    "What type of content do you feel most comfortable creating? (videos, photos, written posts, etc.)"
  ];
  
  // Suggested answers for each question - empty array for name question
  const suggestedAnswers = [
    [], // No name suggestions 
    ["I run a personal training business focusing on strength training", "I teach yoga classes for all levels", "I have a CrossFit gym with group and individual coaching"], // Business suggestions
    ["Increase client retention by 20%", "Launch a new online program", "Grow my Instagram following to 10K followers"], // Goals suggestions
    ["Women 30-45 who want to get fit but lack time", "Men 25-40 looking to build muscle", "Seniors interested in improving mobility and strength"], // Target audience suggestions
    ["I focus on sustainable lifestyle changes, not quick fixes", "I use a science-based approach with measurable results", "I provide more personalized attention than larger gyms"], // Unique approach suggestions
    ["Short workout videos", "Before and after transformations", "Educational content about fitness myths"], // Content type suggestions
  ];
  
  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Initial setup - show first question and suggestions
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        sender: 'assistant',
        text: questions[0],
      }]);
      setChatSuggestions(suggestedAnswers[0]);
    }
    
    scrollToBottom();
  }, [messages]);
  
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
  
  // Debounced suggestion generation for feedback
  const handleFeedbackChange = (e) => {
    const newText = e.target.value;
    setFeedbackPopup({
      ...feedbackPopup,
      text: newText
    });
    
    // Clear any existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to update suggestions after typing stops
    const timeout = setTimeout(() => {
      generateSuggestions(newText, feedbackPopup.section);
    }, 500); // 500ms debounce
    
    setTypingTimeout(timeout);
  };
  
  const processUserInput = async (input, step) => {
    // Store user's answer
    const newUserData = { ...userData };
    
    if (step === 0) {
      newUserData.name = input;
    } else if (step === 1) {
      newUserData.business = input;
    } else {
      newUserData.answers.push(input);
    }
    
    setUserData(newUserData);
    
    // If we've completed all questions, generate the matrix
    if (step === questions.length - 1) {
      setIsProcessing(true);
      
      // In a real app, we would call an AI API here
      // For now, we'll simulate a delay and generate mock data
      setTimeout(() => {
        generateMatrix(newUserData);
        setIsProcessing(false);
        setShowMatrix(true);
      }, 3000);
      
      return;
    }
    
    // Otherwise, show the next question and update suggestions
    setIsProcessing(true);
    
    // Simulate AI thinking delay
    setTimeout(() => {
      const nextStep = step + 1;
      
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: questions[nextStep],
        }
      ]);
      
      // Update suggestions for the next question
      setChatSuggestions(suggestedAnswers[nextStep]);
      
      setIsProcessing(false);
      setCurrentStep(nextStep);
    }, 1000);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentInput.trim() || isProcessing) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        sender: 'user',
        text: currentInput,
      }
    ]);
    
    processUserInput(currentInput, currentStep);
    setCurrentInput('');
  };
  
  const handleSuggestionSelect = (suggestion) => {
    if (isProcessing) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        sender: 'user',
        text: suggestion,
      }
    ]);
    
    processUserInput(suggestion, currentStep);
  };
  
  const generateMatrix = (data) => {
    // In a real app, this would call an AI endpoint
    // For now, we'll generate mock data based on user input
    
    // Add final message from assistant
    setMessages(prev => [
      ...prev,
      {
        sender: 'assistant',
        text: `Thanks for sharing all that information, ${data.name}! I've analyzed your responses and created a strategic marketing matrix for your fitness business. This will help guide your Instagram content strategy. Click on any cell to refine it with your feedback.`,
      }
    ]);
    
    // Generate mock matrix based on user data
    const mockMatrix = {
      targetAudience: [
        `${data.answers[1]?.includes('women') ? 'Women' : 'Adults'} aged 25-45 who want to improve their fitness`,
        `Busy professionals looking for efficient ${data.business?.toLowerCase().includes('class') ? 'group workouts' : 'training sessions'}`,
        `${data.answers[1]?.includes('beginners') ? 'Beginners' : 'Individuals'} interested in ${data.business?.toLowerCase().includes('nutrition') ? 'nutrition and wellness' : 'fitness and health'}`
      ],
      objectives: [
        `Increase Instagram engagement by 30% in the next 3 months`,
        `Build a reputation as a ${data.answers[2]?.includes('unique') ? 'unique' : 'trusted'} voice in fitness`,
        `Convert followers to ${data.business?.toLowerCase().includes('online') ? 'online clients' : 'in-person clients'}`
      ],
      keyMessages: [
        `${data.business} helps you achieve results with a personalized approach`,
        `Transform your fitness journey with expert guidance from ${data.name}`,
        `Join a supportive community that helps you reach your goals`
      ]
    };
    
    setMatrix(mockMatrix);
  };
  
  const handleSaveStrategy = async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .insert([
          { 
            user_id: user.id,
            name: `${userData.name}'s Marketing Strategy`,
            business_description: userData.business,
            target_audience: matrix.targetAudience,
            objectives: matrix.objectives,
            key_messages: matrix.keyMessages
          }
        ]);
      
      if (error) throw error;
      
      router.push('/dashboard?success=strategy-created');
    } catch (error) {
      console.error('Error saving strategy:', error);
      // Handle error - maybe show an error message to the user
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
                  {chatSuggestions.length > 0 && (
                    <h4 className={styles.suggestionsTitle}>Example Answers</h4>
                  )}
                  {chatSuggestions.map((suggestion, index) => (
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