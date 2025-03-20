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
      Create a focused 3-week social media content plan for a fitness business.
      
      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      Create 3 social media posts per week (9 total posts). Each post must include:
      - Type (Carousel/Video/Reel/Story/Image)
      - Topic
      - Audience (use exact language from target audience list)
      - CTA (call to action)
      - Principle (persuasion principle)
      - Visual recommendation (brief)
      - Proposed caption (100-150 words max)
      
      Format as clean JSON:
      {
        "campaigns": [
          {
            "week": 1,
            "theme": "Theme based on key message 1",
            "posts": [
              {
                "type": "Post type",
                "topic": "Topic",
                "audience": "Target audience",
                "cta": "Call to action",
                "principle": "Principle",
                "principleExplanation": "Brief explanation",
                "visual": "Visual recommendation",
                "proposedCaption": "Caption text"
              }
            ]
          }
        ]
      }
      
      IMPORTANT: Provide ONLY the JSON object, nothing else.
    `;
    
    console.log("Sending prompt to Gemini API...");
    
    // Add retry logic for API calls
    const maxRetries = 3;
    let attempt = 0;
    let result;
    
    while (attempt < maxRetries) {
      try {
        console.log(`API attempt ${attempt + 1} of ${maxRetries}...`);
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        });
        
        // If we get here, the call succeeded
        break;
      } catch (apiError) {
        attempt++;
        console.error(`API attempt ${attempt} failed:`, apiError.message);
        
        if (attempt >= maxRetries) {
          console.error("All API retry attempts failed");
          throw apiError;
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    const response = result.response;
    const text = response.text();
    
    // Process the response to extract clean JSON
    let jsonData;
    try {
      // First, try to directly parse the text as JSON
      try {
        jsonData = JSON.parse(text);
      } catch (directParseError) {
        console.log("Direct JSON parsing failed, trying to extract JSON from text");
        
        // Try to find JSON in the response with various patterns
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                          text.match(/```\n([\s\S]*?)\n```/) || 
                          text.match(/({[\s\S]*?})/);
        
        if (jsonMatch) {
          // Clean up the JSON string
          const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '').trim();
          console.log("Extracted JSON string:", jsonString.substring(0, 100) + "...");
          
          // Try parsing the extracted JSON
          try {
            jsonData = JSON.parse(jsonString);
          } catch (extractedParseError) {
            console.error("Error parsing extracted JSON:", extractedParseError);
            throw new Error("Failed to parse extracted JSON content");
          }
        } else {
          console.error("No JSON pattern found in response");
          throw new Error("No valid JSON found in the response");
        }
      }
      
      // Verify we have the right structure
      if (!jsonData.campaigns) {
        // If we're missing the campaigns property but have other data, try to fix it
        if (jsonData.length > 0 && Array.isArray(jsonData)) {
          // The model might have returned an array of weeks directly
          jsonData = { campaigns: jsonData };
          console.log("Restructured array response into proper format");
        } else {
          throw new Error("Response missing 'campaigns' property and couldn't be restructured");
        }
      }
      
      console.log("Successfully parsed JSON response with", 
                 jsonData.campaigns.length, "campaign weeks");
      
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