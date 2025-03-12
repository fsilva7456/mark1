import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gymData, messages, userData } = req.body;
    
    if (!gymData || gymData.length === 0) {
      return res.status(200).json({ 
        response: "I couldn't find specific competitor data for your area. Let's continue building your strategy based on your unique approach."
      });
    }
    
    // Create a string representation of the gym data
    const gymDataStr = gymData.map(gym => `
Gym Name: ${gym.name}
Offerings: ${gym.offerings || 'Not available'}
Positive Feedback: ${gym.positives || 'Not available'}
Negative Feedback: ${gym.negatives || 'Not available'}
Target Audience: ${gym.targetAudience || 'Not available'}
Opportunities: ${gym.opportunities || 'Not available'}
Location: ${gym.location || 'Not available'}
    `).join('\n\n');
    
    // Prompt for Gemini
    const prompt = `
I've gathered data on fitness businesses in the area. Here's what I found:

${gymDataStr}

Based on this competitive landscape and our conversation so far about the user's fitness business, provide insights on:
1. What gaps or opportunities exist in the market that the user could capitalize on
2. How the user could differentiate their marketing from competitors
3. What target audiences might be underserved

Format your response as helpful insights for the user. Don't mention that you're analyzing competitor data - just present your findings as expert advice. The response should be conversational and end with a question to continue gathering information for their marketing strategy.
`;

    // Generate a response from Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to analyze competitors' });
  }
} 