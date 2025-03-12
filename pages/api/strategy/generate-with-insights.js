import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("DEBUG API: generate-with-insights called");
  
  try {
    const { userData, gymData } = req.body;
    
    console.log("DEBUG API: Received user data:", userData?.name, "and gym data:", gymData?.length);
    
    if (!userData) {
      console.log("DEBUG API: No user data provided");
      return res.status(400).json({ error: 'User data is required' });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      console.log("DEBUG API: No Gemini API key found");
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }
    
    // Format the gym data insights
    const gymInsights = gymData && gymData.length > 0 
      ? gymData.map(gym => `
Gym: ${gym.name || 'Unknown'}
Offerings: ${gym.offerings || 'Not specified'}
What clients like: ${gym.positives || 'Not specified'}
What clients dislike: ${gym.negatives || 'Not specified'}
Target audience: ${gym.targetAudience || 'Not specified'}
Market opportunities: ${gym.opportunities || 'Not specified'}
      `).join('\n---\n')
      : 'No competitor data available';
    
    console.log("DEBUG API: Created gym insights, length:", gymInsights.length);
    
    // Create prompt for Gemini
    const prompt = `
You are a marketing strategy expert for fitness professionals. I need you to create a 3x3 marketing strategy matrix based on user information and competitor insights.

USER INFORMATION:
Name: ${userData.name}
Business Type: ${userData.business}
Target Audience: ${userData.audience}
Marketing Goals: ${userData.goals}
Unique Selling Proposition: ${userData.unique}
Content Preferences: ${userData.content}

COMPETITOR INSIGHTS FROM LOCAL GYMS AND FITNESS BUSINESSES:
${gymInsights}

Based on this information, create a highly strategic and differentiated 3x3 marketing matrix with:
1. Target Audience (3 specific audience segments this fitness professional should target)
2. Objectives (3 measurable marketing goals they should pursue)
3. Key Messages (3 compelling value propositions that will resonate with their audience)

Each element of the matrix should:
- Leverage insights from competitor data to identify gaps and opportunities
- Consider the unique selling proposition of the user's business
- Be specific, actionable, and tailored to the fitness industry
- Help differentiate from competitors in the market

Return your response in this JSON format:
{
  "targetAudience": [
    "First audience segment with specific details",
    "Second audience segment with specific details",
    "Third audience segment with specific details"
  ],
  "objectives": [
    "First measurable marketing objective",
    "Second measurable marketing objective",
    "Third measurable marketing objective"
  ],
  "keyMessages": [
    "First compelling value proposition",
    "Second compelling value proposition",
    "Third compelling value proposition"
  ]
}
`;

    // Call Gemini API to generate the strategy
    try {
      console.log("DEBUG API: Initializing Gemini model");
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      console.log("DEBUG API: Sending prompt to Gemini");
      const result = await model.generateContent(prompt);
      
      console.log("DEBUG API: Received response from Gemini");
      const responseText = result.response.text();
      
      // Parse JSON from the response
      let matrix;
      try {
        // Try to extract JSON if it's wrapped in markdown code block
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                         responseText.match(/```\n([\s\S]*?)\n```/) ||
                         responseText.match(/{[\s\S]*?}/);
                         
        if (jsonMatch) {
          const jsonText = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
          matrix = JSON.parse(jsonText);
        } else {
          throw new Error('Failed to extract JSON from response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.log('Raw response:', responseText);
        
        // Create a fallback matrix based on the user data
        matrix = {
          targetAudience: [
            `${userData.audience} seeking personalized fitness solutions`,
            `Busy professionals looking for efficient workout options`,
            `Fitness enthusiasts wanting to reach new goals`
          ],
          objectives: [
            `Attract new clients through targeted content marketing`,
            `Build a reputation as a trusted fitness provider`,
            `Convert prospects to paying clients through effective messaging`
          ],
          keyMessages: [
            `Experience a fitness approach tailored to your specific needs`,
            `Achieve your goals faster with our proven fitness systems`,
            `Join a supportive community that helps you stay accountable`
          ]
        };
      }
      
      return res.status(200).json({ matrix });
    } catch (geminiError) {
      console.error('DEBUG API: Error calling Gemini API:', geminiError);
      throw new Error(`Gemini API error: ${geminiError.message}`);
    }
  } catch (error) {
    console.error('DEBUG API: Error generating enhanced strategy:', error);
    return res.status(500).json({ 
      error: 'Failed to generate enhanced strategy',
      details: error.message 
    });
  }
} 