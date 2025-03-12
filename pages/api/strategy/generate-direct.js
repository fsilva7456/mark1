import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, isDebugMode } = req.body;
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: 'API key not configured' });
    }

    try {
      // Use direct content generation with better error handling
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 800,
        }
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), 15000);
      });
      
      // Race the API call against the timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]);
      
      const responseText = result.response.text();
      
      // Check for special commands
      const showMatrix = responseText.includes('[READY_FOR_MATRIX]');
      
      // Check for location-specific competitor data request
      let requestCompetitorData = false;
      let location = null;
      
      const dataRequestMatch = responseText.match(/\[REQUEST_COMPETITOR_DATA:([^\]]+)\]/);
      if (dataRequestMatch && dataRequestMatch[1]) {
        requestCompetitorData = true;
        location = dataRequestMatch[1].trim();
      }
      
      // Clean up the response
      const cleanResponse = responseText
        .replace(/\[READY_FOR_MATRIX\]/g, '')
        .replace(/\[REQUEST_COMPETITOR_DATA:[^\]]+\]/g, '')
        .trim();
      
      return res.status(200).json({ 
        response: cleanResponse,
        requestCompetitorData,
        showMatrix,
        location
      });
    } catch (generationError) {
      console.error("Gemini API error:", generationError);
      
      if (isDebugMode) {
        return res.status(500).json({
          error: 'Generation failed',
          details: generationError.message,
          stack: generationError.stack
        });
      }
      
      throw generationError;
    }
  } catch (error) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message
    });
  }
} 