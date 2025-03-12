import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  try {
    console.log("Testing Gemini API connection...");
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Initialize the API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try a very simple prompt to test connectivity
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    console.log("Sending test prompt to Gemini...");
    const result = await model.generateContent('Hello, please respond with "Gemini API is working correctly."');
    
    const text = result.response.text();
    console.log("Received response:", text);
    
    return res.status(200).json({ 
      success: true, 
      message: 'API is working correctly', 
      response: text 
    });
  } catch (error) {
    console.error("Error testing Gemini API:", error);
    
    return res.status(500).json({
      error: 'API test failed',
      details: error.message,
      stack: error.stack
    });
  }
} 