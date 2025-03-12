import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, messages, matrixStage, userData } = req.body;
    
    // Create a conversation history for Gemini
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
    const chat = model.startChat({
      history: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    const result = await chat.sendMessage(`Based on the conversation so far, provide the next question or response to help create a marketing strategy. If you need competitor data, include [REQUEST_COMPETITOR_DATA] and the location in your response. If you have enough information to create the strategy matrix, include [READY_FOR_MATRIX] in your response.`);
    
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
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
} 