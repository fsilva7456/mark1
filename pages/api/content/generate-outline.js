import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { strategy } = req.body;
    
    if (!strategy || !strategy.target_audience || !strategy.objectives || !strategy.key_messages) {
      return res.status(400).json({ 
        error: 'Missing required strategy information',
        strategy: JSON.stringify(strategy) 
      });
    }
    
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a simplified prompt to reduce potential errors
    const prompt = `
      Create a 3-week content marketing campaign for this fitness business:
      ${strategy.business_description || 'Fitness business'}
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. ${audience}`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. ${objective}`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. ${message}`).join('\n')}
      
      Format the response as a JSON with this structure:
      {
        "campaigns": [
          {
            "week": 1,
            "theme": "Theme based on key message",
            "posts": [
              {
                "type": "Content type",
                "topic": "Topic description",
                "audience": "Target audience",
                "cta": "Call to action",
                "principle": "Persuasion principle",
                "principleExplanation": "Explanation",
                "visual": "Visual recommendation"
              },
              // 2 more posts
            ]
          },
          // Weeks 2 and 3
        ]
      }
    `;
    
    console.log("Sending prompt to Gemini API...");
    const result = await model.generateContent(prompt);
    console.log("Received response from Gemini API");
    
    const response = result.response;
    const text = response.text();
    
    // Attempt to parse JSON more safely
    let campaigns;
    try {
      // First try to match JSON block
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/```\n([\s\S]*?)\n```/) || 
                        text.match(/{[\s\S]*?}/);
                        
      if (jsonMatch) {
        const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
        campaigns = JSON.parse(jsonString);
      } else {
        // If no JSON format detected, try to extract from the whole response
        campaigns = JSON.parse(text);
      }
      
      // Verify campaigns structure
      if (!campaigns || !campaigns.campaigns) {
        console.error("Invalid campaigns structure:", campaigns);
        throw new Error('Invalid response structure from API');
      }
      
      return res.status(200).json(campaigns);
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      console.log('Raw API response:', text.substring(0, 1000)); // Log first 1000 chars
      
      // Return a fallback structure if parsing fails
      return res.status(500).json({ 
        error: 'Failed to parse API response', 
        rawResponse: text.substring(0, 500) // First 500 chars for debugging
      });
    }
  } catch (error) {
    console.error('Error generating content outline:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content outline', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 