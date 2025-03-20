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
    // Try a more stable model - gemini-2.0-flash might not be available
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300,
        responseFormat: { type: "json" },
      }
    });
    
    // Create a very focused prompt just for theme generation
    const prompt = `
      Create 3 weekly content themes for a fitness social media campaign.

      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      Make each week's theme match one of the key messages. Each theme should be brief (5-7 words).
      
      RETURN ONLY THIS JSON STRUCTURE:
      {"weeklyThemes":[{"week":1,"theme":"Theme for Week 1"},{"week":2,"theme":"Theme for Week 2"},{"week":3,"theme":"Theme for Week 3"}]}
    `;
    
    console.log("Sending theme generation prompt to Gemini API...");
    
    // Add retry logic for API calls
    const maxRetries = 3;
    let attempt = 0;
    let result;
    
    while (attempt < maxRetries) {
      try {
        console.log(`API attempt ${attempt + 1} of ${maxRetries}...`);
        
        // Extra debug info
        console.log("API key exists:", !!apiKey);
        console.log("Model being used:", "gemini-1.5-flash");
        console.log("Strategy data preview:", JSON.stringify({
          has_business_desc: !!strategy.business_description,
          target_audience_count: strategy.target_audience?.length || 0,
          objectives_count: strategy.objectives?.length || 0,
          key_messages_count: strategy.key_messages?.length || 0
        }));
        
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        
        // If we get here, the call succeeded
        break;
      } catch (apiError) {
        attempt++;
        // Enhanced error logging
        console.error(`API attempt ${attempt} failed:`, apiError.message);
        console.error("Error details:", JSON.stringify(apiError));
        
        if (attempt >= maxRetries) {
          console.error("All API retry attempts failed");
          throw new Error(`Gemini API error: ${apiError.message}`);
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
      if (!jsonData.weeklyThemes) {
        throw new Error("Response missing 'weeklyThemes' property");
      }
      
      // Check that we have 3 themes
      if (!Array.isArray(jsonData.weeklyThemes) || jsonData.weeklyThemes.length !== 3) {
        console.warn("Invalid themes count, adjusting structure...");
        
        // Create default themes based on key messages if available
        const defaultThemes = [];
        for (let i = 0; i < 3; i++) {
          defaultThemes.push({
            week: i + 1,
            theme: strategy.key_messages[i] ? 
              `Week ${i + 1}: ${strategy.key_messages[i].substring(0, 30)}...` : 
              `Week ${i + 1}: Fitness Content`
          });
        }
        
        jsonData.weeklyThemes = defaultThemes;
      }
      
      console.log("Successfully parsed themes JSON");
      
      return res.status(200).json(jsonData);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      
      // Create fallback themes in case of parsing error
      const fallbackThemes = {
        weeklyThemes: [
          { week: 1, theme: "Introduction to Your Fitness Approach" },
          { week: 2, theme: "Client Success Stories" },
          { week: 3, theme: "Educational Fitness Content" }
        ]
      };
      
      console.log("Using fallback themes due to parsing error");
      return res.status(200).json(fallbackThemes);
    }
  } catch (error) {
    console.error('Error generating themes:', error);
    
    // Even if everything fails, return some usable fallback
    return res.status(200).json({ 
      weeklyThemes: [
        { week: 1, theme: "Introduction to Your Fitness Approach" },
        { week: 2, theme: "Client Success Stories" },
        { week: 3, theme: "Educational Fitness Content" }
      ]
    });
  }
} 