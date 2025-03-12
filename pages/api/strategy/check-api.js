import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment variables' });
    }
    
    // Initialize the API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Simple test call
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('Hello, are you working?');
    const text = result.response.text();
    
    return res.status(200).json({ success: true, message: 'API is working correctly', sample: text });
  } catch (error) {
    return res.status(500).json({ 
      error: 'API test failed', 
      details: error.message,
      stack: error.stack 
    });
  }
} 