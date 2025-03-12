import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, userData } = req.body;
    
    // Create a string representation of the conversation
    const conversationStr = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    // Prompt for Gemini
    const prompt = `
Based on the following conversation with a fitness professional, create a 3x3 marketing strategy matrix with:
1. Target Audience (3 distinct audience segments)
2. Objectives (3 clear marketing goals)
3. Key Messages (3 compelling value propositions)

Conversation:
${conversationStr}

Format your response as a JSON object with this structure:
{
  "targetAudience": ["audience1", "audience2", "audience3"],
  "objectives": ["objective1", "objective2", "objective3"],
  "keyMessages": ["message1", "message2", "message3"]
}

Make each entry specific, actionable, and tailored to the user's fitness business. Ensure all 9 elements work together cohesively.
`;

    // Generate a response from Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from the response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                     response.match(/{[\s\S]*?}/);
                     
    let matrix;
    if (jsonMatch) {
      try {
        matrix = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        console.error('Error parsing matrix JSON:', e);
        throw new Error('Failed to parse matrix data');
      }
    } else {
      throw new Error('No valid matrix data found in response');
    }
    
    return res.status(200).json({ matrix });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate matrix' });
  }
} 