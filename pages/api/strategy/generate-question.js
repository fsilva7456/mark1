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

    // TEMPORARY HARDCODED FIX: Use hardcoded response for the second message
    if (messages.length === 1) {
      // Get the user's name from their first response
      const userName = messages[0].content.trim();
      
      console.log("Received user name:", userName);
      
      // Provide a welcoming response using their name
      return res.status(200).json({
        response: `It's great to meet you, ${userName}! To help create an effective marketing strategy for your fitness business, I'd like to understand more about what you do. Could you briefly describe your fitness business? For example, are you a personal trainer, run a studio, or offer another type of fitness service?`
      });
    }
    
    // Rest of your existing code for handling messages after the first interaction
    try {
      // Create conversation history for Gemini...
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
      
      // Regular chat interface for messages after the first interaction
      const chat = model.startChat({
        history: geminiMessages.slice(0, -1),
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });
      
      const result = await chat.sendMessage(
        `Based on the conversation so far, provide the next question or response to help create a marketing strategy. If you need competitor data, include [REQUEST_COMPETITOR_DATA] and the location in your response. If you have enough information to create the strategy matrix, include [READY_FOR_MATRIX] in your response.`
      );
      
      // Process the response...
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