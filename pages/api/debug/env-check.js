export default function handler(req, res) {
  // Check if environment variables are set
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    // Don't log the actual values for security reasons
    GEMINI_API_KEY_LENGTH: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
  };

  return res.status(200).json({
    message: 'Environment variables status',
    status: envStatus,
    nodeEnv: process.env.NODE_ENV,
  });
} 