export default async function handler(req, res) {
  try {
    // Check if the Gemini API key is available
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    // Return basic information without making any API calls
    return res.status(200).json({
      success: true,
      message: "Simple test API is working",
      environment: process.env.NODE_ENV,
      hasApiKey: hasApiKey,
      apiKeyLength: hasApiKey ? process.env.GEMINI_API_KEY.length : 0,
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    });
  } catch (error) {
    console.error('Simple test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 