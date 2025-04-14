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
    
    // Create a highly optimized prompt to reduce API errors
    const prompt = `
      Create a fitness social media content plan (9 posts total).

      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      FORMAT: 3 weeks, 3 posts per week. Each post must have:
      - type (Carousel/Video/Reel/Story/Image)
      - topic
      - audience
      - cta
      - principle
      - principleExplanation (1 sentence only)
      - visual (2-3 words)
      - proposedCaption (50-75 words max)
      
      RETURN ONLY THIS JSON STRUCTURE:
      {"campaigns":[{"week":1,"theme":"Theme1","posts":[{"type":"","topic":"","audience":"","cta":"","principle":"","principleExplanation":"","visual":"","proposedCaption":""}]}]}
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
            temperature: 0.5,  // Lower temperature for more consistent output
            maxOutputTokens: 1500,  // Reduce token limit to prevent timeout
            responseFormat: { type: "json" }, // Force JSON response format
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
    
    // Process the response to extract clean JSON
    let jsonData;
    try {
      // Get the text response and log a preview
      const text = response.text();
      console.log("API response preview:", text.substring(0, 100) + "...");
      
      // Try direct parsing first with error handling
      try {
        // Basic cleanup: remove any markdown formatting and leading/trailing whitespace
        const cleanedText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^\s+|\s+$/g, '');
          
        jsonData = JSON.parse(cleanedText);
        console.log("JSON parsed successfully");
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError.message);
        
        // Fallback extraction if needed
        try {
          // Look for any JSON-like structure
          const jsonPattern = /(\{[\s\S]*\})/g;
          const matches = text.match(jsonPattern);
          
          if (matches && matches.length > 0) {
            console.log("Found JSON pattern in response, attempting extraction");
            jsonData = JSON.parse(matches[0]);
          } else {
            throw new Error("No valid JSON found in response");
          }
        } catch (fallbackError) {
          console.error("Fallback parsing also failed:", fallbackError.message);
          throw new Error("Unable to extract valid JSON from response: " + fallbackError.message);
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