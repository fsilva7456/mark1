import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("DIAGNOSTIC - Loaded generate-direct.js, GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("DIAGNOSTIC - GEMINI_API_KEY length:", process.env.GEMINI_API_KEY.length);
} else {
  console.error("DIAGNOSTIC - GEMINI_API_KEY is not configured!");
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, isDebugMode } = req.body;
    
    console.log("DIAGNOSTIC - API received request with prompt length:", prompt?.length || 0);
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error("DIAGNOSTIC - GEMINI_API_KEY is not set");
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Log truncated prompt for debugging
    const promptPreview = prompt ? `${prompt.substring(0, 100)}...` : 'No prompt provided';
    console.log("DIAGNOSTIC - Prompt preview:", promptPreview);

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
      
      console.log("DIAGNOSTIC - Initialized Gemini model, sending content...");
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), 15000);
      });
      
      // Race the API call against the timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]);
      
      console.log("DIAGNOSTIC - Received response from Gemini");
      
      const responseText = result.response.text();
      console.log("DIAGNOSTIC - Response preview:", responseText.substring(0, 100) + "...");
      
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
      console.error("DIAGNOSTIC - Gemini API error:", generationError);
      console.error("DIAGNOSTIC - Error stack:", generationError.stack);
      
      // For the second message, provide a hardcoded response
      if (prompt.includes("User: ") && !prompt.includes("AI: ")) {
        // This is likely the second message (after name)
        console.log("DIAGNOSTIC - Providing hardcoded response for second message");
        
        // Extract the name from the prompt
        const nameMatch = prompt.match(/User: ([^\n]+)/);
        const name = nameMatch ? nameMatch[1].trim() : "there";
        
        return res.status(200).json({
          response: `Hi ${name}! I'd like to understand more about your fitness business. What type of fitness services do you offer? For example, are you a personal trainer, run a gym, or offer specialized fitness classes?`,
          showMatrix: false,
          requestCompetitorData: false
        });
      }
      
      if (isDebugMode) {
        return res.status(500).json({
          error: 'Generation failed',
          details: generationError.message,
          stack: generationError.stack,
          promptLength: prompt?.length || 0,
          promptPreview: promptPreview
        });
      }
      
      throw generationError;
    }
  } catch (error) {
    console.error('DIAGNOSTIC - Error in API handler:', error);
    console.error('DIAGNOSTIC - Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message,
      errorType: error.constructor.name,
      stack: isDebugMode ? error.stack : undefined
    });
  }
} 