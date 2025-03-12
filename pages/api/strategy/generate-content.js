import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, userData, isDebugMode } = req.body;
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: 'API key not configured' });
    }

    try {
      // Use simpler content generation instead of chat API
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Check for special commands
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
      
      // Clean up the response
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
      throw generationError;
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message,
      stack: isDebugMode ? error.stack : undefined
    });
  }
} 