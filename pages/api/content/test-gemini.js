import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    
    // If no API key, return an error
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Missing API key', 
        success: false 
      });
    }
    
    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Generate a simple response
    const result = await model.generateContent("Create a one-paragraph example for a fitness instructor's Instagram post");
    const response = result.response;
    const text = response.text();
    
    return res.status(200).json({ 
      success: true, 
      response: text,
      apiKeyLength: apiKey.length, // Just return the length to confirm it exists
    });
  } catch (error) {
    console.error('Gemini API test error:', error);
    return res.status(500).json({ 
      error: error.message, 
      success: false,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 