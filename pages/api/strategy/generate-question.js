import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, messages, matrixStage, userData, isDebugMode } = req.body;
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: 'API key not configured' });
    }

    // For initial message, provide a default response if there are no messages
    if (messages.length === 0) {
      return res.status(200).json({ 
        response: "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?"
      });
    }
    
    // Create a conversation history for Gemini
    try {
      const geminiMessages = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ];
      
      // Add the conversation history
      messages.forEach(msg => {
        geminiMessages.push({
          role: msg.role,
          parts: [{ text: msg.content }]
        });
      });
      
      // Generate a response from Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      // Change how we're handling the chat history and message
      let result;
      
      if (messages.length <= 1) {
        // For the first real interaction (after user enters name)
        // Use a direct content generation instead of chat
        const prompt = `${systemPrompt}\n\nThe user's name is: ${messages[0].content}\n\nProvide a friendly response that welcomes them by name and asks about their fitness business.`;
        
        result = await model.generateContent(prompt);
      } else {
        // For subsequent messages, use the chat interface
        const chat = model.startChat({
          history: geminiMessages.slice(0, -1),
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
          }
        });
        
        result = await chat.sendMessage(
          `Based on the conversation so far, provide the next question or response to help create a marketing strategy. If you need competitor data, include [REQUEST_COMPETITOR_DATA] and the location in your response. If you have enough information to create the strategy matrix, include [READY_FOR_MATRIX] in your response.`
        );
      }
      
      const responseText = result.response.text();
      
      // Check for special commands in the response
      const requestCompetitorData = responseText.includes('[REQUEST_COMPETITOR_DATA]');
      const readyForMatrix = responseText.includes('[READY_FOR_MATRIX]');
      
      // Extract location if competitor data is requested
      let location = null;
      if (requestCompetitorData) {
        const locationMatch = responseText.match(/\[LOCATION: (.*?)\]/);
        if (locationMatch && locationMatch[1]) {
          location = locationMatch[1];
        }
      }
      
      // Clean up the response by removing special commands
      const cleanResponse = responseText
        .replace(/\[REQUEST_COMPETITOR_DATA\]/g, '')
        .replace(/\[READY_FOR_MATRIX\]/g, '')
        .replace(/\[LOCATION: .*?\]/g, '')
        .trim();
      
      return res.status(200).json({ 
        response: cleanResponse,
        requestCompetitorData,
        showMatrix: readyForMatrix,
        location
      });
    } catch (generationError) {
      console.error("Gemini API error:", generationError);
      
      // Special handling for first message
      if (messages.length <= 1) {
        return res.status(200).json({
          response: "Hi! I'm your AI marketing assistant. I'll help you create a marketing strategy for your fitness business. First, could you tell me your name?"
        });
      }
      
      throw generationError; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message,
      stack: isDebugMode ? error.stack : undefined
    });
  }
} 