import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { strategy } = req.body;
    
    if (!strategy || !strategy.target_audience || !strategy.objectives || !strategy.key_messages) {
      return res.status(400).json({ error: 'Missing required strategy information' });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a structured prompt that clearly guides the AI to use the strategy elements
    const prompt = `
      Create a highly personalized 3-week content marketing campaign specifically for this fitness business:
      
      BUSINESS INFORMATION:
      ${strategy.business_description || 'Fitness business'}
      
      TARGET AUDIENCE (Use these exact audiences in the content plan):
      ${strategy.target_audience.map((audience, i) => `${i+1}. ${audience}`).join('\n')}
      
      MARKETING OBJECTIVES (Address these specific objectives):
      ${strategy.objectives.map((objective, i) => `${i+1}. ${objective}`).join('\n')}
      
      KEY MESSAGES (Incorporate these exact messages):
      ${strategy.key_messages.map((message, i) => `${i+1}. ${message}`).join('\n')}
      
      INSTRUCTIONS:
      1. Create 3 weeks of content, with each week having a clear theme based on the key messages
      2. For each week, provide 3 posts
      3. For each post, specify: type (Carousel, Video, Story, Reel, or Image), topic, target audience (use exact audience from above), call-to-action, persuasion principle used, and visual recommendation
      4. Ensure each post directly addresses one of the audiences and supports one of the objectives
      5. Use the exact language from the key messages in the content topics
      
      Format the response as a valid JSON object with this structure:
      {
        "campaigns": [
          {
            "week": 1,
            "theme": "Theme for week 1 based on key message 1",
            "posts": [
              {
                "type": "Content type",
                "topic": "Detailed topic description",
                "audience": "Exact target audience from the list above",
                "cta": "Call to action for this post",
                "principle": "Persuasion principle used",
                "principleExplanation": "Brief explanation of how this principle works",
                "visual": "Visual recommendation"
              },
              // 2 more posts for week 1
            ]
          },
          // Weeks 2 and 3 with similar structure
        ]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract the JSON response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                      text.match(/```\n([\s\S]*?)\n```/) || 
                      text.match(/{[\s\S]*?}/);
                      
    let campaigns;
    
    if (jsonMatch) {
      const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
      campaigns = JSON.parse(jsonString);
    } else {
      // If no JSON format detected, try to extract from the whole response
      try {
        campaigns = JSON.parse(text);
      } catch (e) {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    
    return res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error generating content outline:', error);
    return res.status(500).json({ error: 'Failed to generate content outline', details: error.message });
  }
} 