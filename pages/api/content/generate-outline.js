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
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a simplified prompt that should work better
    const prompt = `
      Create a highly specific 3-week content marketing campaign for this fitness business:
      
      BUSINESS DESCRIPTION:
      "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      Instructions:
      1. Create a detailed social media content plan with 3 weeks of content
      2. For each week, provide a clear theme based on one of the key messages
      3. For each week, create 3 posts with detailed topics
      4. Each post must include: content type, topic, target audience, CTA, principle, explanation, visual recommendation, and proposed caption/text
      5. Use exact language from the key messages and target the specific audiences listed
      
      Format your response as a clean JSON object like this (no explanation, just the JSON):
      
      {
        "campaigns": [
          {
            "week": 1,
            "theme": "Theme from key message 1",
            "posts": [
              {
                "type": "Carousel/Video/Reel/Story/Image",
                "topic": "Detailed post topic",
                "audience": "One of the target audiences listed above",
                "cta": "Call to action",
                "principle": "Persuasion principle",
                "principleExplanation": "Brief explanation",
                "visual": "Visual recommendation",
                "proposedCaption": "Suggested text/caption for the post that incorporates the key message and calls to action"
              },
              // More posts for week 1
            ]
          },
          // Week 2 and 3 with same structure
        ]
      }
    `;
    
    console.log("Sending prompt to Gemini API...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    
    const response = result.response;
    const text = response.text();
    
    // Process the response to extract clean JSON
    let jsonData;
    try {
      // Try to find JSON in the response first
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/```\n([\s\S]*?)\n```/) || 
                        text.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        // Clean up the JSON string
        const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
        jsonData = JSON.parse(jsonString);
      } else {
        // Direct parse if no markdown code blocks
        jsonData = JSON.parse(text);
      }
      
      // Verify we have the right structure
      if (!jsonData.campaigns) {
        throw new Error("Response missing 'campaigns' property");
      }
      
      return res.status(200).json(jsonData);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", text.substring(0, 500)); // Log first 500 chars
      return res.status(500).json({ 
        error: "Failed to parse Gemini response",
        rawResponsePreview: text.substring(0, 200) // First 200 chars for debugging
      });
    }
  } catch (error) {
    console.error('Error generating content outline:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content outline', 
      message: error.message
    });
  }
} 