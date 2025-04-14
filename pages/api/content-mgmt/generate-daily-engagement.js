import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { strategyMatrix, campaigns, businessType } = req.body;
    
    if (!strategyMatrix || !campaigns) {
      return res.status(400).json({ error: 'Strategy matrix and campaigns data are required' });
    }
    
    // Create a prompt for Gemini to generate daily engagement content
    const prompt = `
You are a fitness marketing expert creating a detailed social media plan for a ${businessType || 'fitness business'}.

MARKETING STRATEGY MATRIX:
Target Audience:
${strategyMatrix.targetAudience.map((audience, i) => `${i+1}. ${audience}`).join('\n')}

Objectives:
${strategyMatrix.objectives.map((objective, i) => `${i+1}. ${objective}`).join('\n')}

Key Messages:
${strategyMatrix.keyMessages.map((message, i) => `${i+1}. ${message}`).join('\n')}

WEEKLY CAMPAIGNS ALREADY PLANNED:
${campaigns.map((campaign, weekIndex) => `
WEEK ${weekIndex+1}: ${campaign.theme}
${campaign.content.map(item => `- ${item}`).join('\n')}
`).join('\n')}

Now, create a "Daily Engagement" plan with 21 days of social media post ideas (3 weeks, 7 days per week). Each post should:
1. Be specific, actionable, and ready to implement
2. Complement the weekly campaigns but not duplicate them
3. Vary in content type (image, video, story, poll, etc.)
4. Include a brief description of the content and suggested caption
5. Target different segments of the audience throughout the week

Format your response as a JSON object with this structure:
{
  "dailyEngagement": [
    {
      "day": 1,
      "week": 1,
      "contentType": "Type of content (image, video, story, etc.)",
      "description": "Brief description of the post content",
      "caption": "Suggested caption including relevant hashtags",
      "targetAudience": "Which audience segment this targets"
    },
    // Repeat for all 21 days...
  ]
}

Keep each post idea concise but descriptive enough to implement easily.
Ensure variety in content types across the week.
Maintain consistency with the overall strategy and messaging.
`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from the response
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       responseText.match(/{[\s\S]*?}/);
                       
      if (jsonMatch) {
        const jsonText = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
        const dailyContent = JSON.parse(jsonText);
        
        // Validate the response structure
        if (!dailyContent.dailyEngagement || !Array.isArray(dailyContent.dailyEngagement)) {
          throw new Error('Invalid response structure');
        }
        
        // Return the generated content
        return res.status(200).json({ dailyEngagement: dailyContent.dailyEngagement });
      } else {
        throw new Error('Failed to extract JSON from response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      
      // Create a fallback response
      const fallbackDailyContent = {
        dailyEngagement: Array(21).fill(null).map((_, index) => {
          const day = index % 7 + 1;
          const week = Math.floor(index / 7) + 1;
          
          return {
            day,
            week,
            contentType: ['Image', 'Video', 'Story', 'Carousel', 'Poll'][index % 5],
            description: `Day ${day} fitness tip related to ${businessType || 'fitness'}`,
            caption: `Boost your fitness journey with this simple tip! #fitness #health #wellness`,
            targetAudience: strategyMatrix.targetAudience[index % 3]
          };
        })
      };
      
      return res.status(200).json({ dailyEngagement: fallbackDailyContent.dailyEngagement });
    }
  } catch (error) {
    console.error('Error generating daily engagement content:', error);
    return res.status(500).json({ 
      error: 'Failed to generate daily engagement content',
      details: error.message 
    });
  }
} 