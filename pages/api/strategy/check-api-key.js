export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    return res.status(200).json({
      keyExists: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 5) + '...' : 'N/A',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error checking API key",
      message: error.message
    });
  }
} 