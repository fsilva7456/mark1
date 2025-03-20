import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { strategy, aesthetic } = req.body;
    
    if (!strategy || !strategy.target_audience || !strategy.objectives || !strategy.key_messages) {
      return res.status(400).json({ 
        error: 'Missing required strategy information',
        strategy: JSON.stringify(strategy) 
      });
    }
    
    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Extra debug info about the key
    console.log("API key exists:", !!apiKey);
    console.log("API key length:", apiKey ? apiKey.length : 0);
    console.log("Aesthetic value provided:", aesthetic || "None provided");
    
    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Define model configuration explicitly for better control
    const modelName = "gemini-2.0-flash";
    const generationConfig = {
      temperature: 0.4,
      maxOutputTokens: 300,
    };
    
    // Update to use the 2.0 model and fix responseFormat configuration
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: generationConfig
    });
    
    // Log model configuration for debugging
    console.log("Using model configuration:", {
      model: modelName,
      generationConfig: generationConfig,
      apiKeyLength: apiKey ? apiKey.length : 0
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
      
      ${aesthetic ? `AESTHETIC/STYLE: "${aesthetic}"` : ''}
      
      Make each week's theme match one of the key messages. Each theme should be specific (8-12 words) and clearly communicate the core value proposition for that week.
      
      ${aesthetic ? `Ensure that all themes align with the specified aesthetic/style: "${aesthetic}"` : ''}
      
      For each theme:
      1. Focus on ONE specific key message
      2. Use powerful action words
      3. Clearly state the benefit to the audience
      4. Make it memorable and engaging
      
      RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT WITHOUT ANY EXPLANATION OR MARKDOWN:
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
        console.log("Model being used:", modelName);
        console.log("Strategy data preview:", JSON.stringify({
          has_business_desc: !!strategy.business_description,
          target_audience_count: strategy.target_audience?.length || 0,
          objectives_count: strategy.objectives?.length || 0,
          key_messages_count: strategy.key_messages?.length || 0,
          aesthetic_provided: !!aesthetic
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
      console.log("API full response:", text); // Log full response for debugging
      
      // Enhanced JSON cleaning
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\\n/g, ' ')  // Replace newlines with spaces
        .replace(/\\"/g, '"'); // Fix escaped quotes
      
      // Additional cleanup to fix common JSON syntax issues
      cleanedText = cleanedText
        .replace(/,\s*}/g, '}')       // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']')      // Remove trailing commas in arrays
        .replace(/(['"])\s*:\s*/g, '$1:'); // Normalize spacing around colons
      
      // Try direct parsing first with error handling
      try {
        jsonData = JSON.parse(cleanedText);
        console.log("JSON parsed successfully");
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError.message);
        console.error(`Position: ${parseError.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
        
        // More aggressive cleanup for malformed JSON
        console.log("Attempting more aggressive JSON cleanup...");
        
        try {
          // Try to extract just the weeklyThemes array if the full JSON is malformed
          const themesPattern = /"weeklyThemes"\s*:\s*\[([\s\S]*?)\]/g;
          const themesMatch = themesPattern.exec(cleanedText);
          
          if (themesMatch && themesMatch[1]) {
            // Try to parse just the themes array
            const themesContent = themesMatch[1].trim();
            
            // Build theme objects individually
            const themeObjects = [];
            const themeBlocks = themesContent.split(/},{/);
            
            for (let i = 0; i < themeBlocks.length; i++) {
              let themeBlock = themeBlocks[i];
              // Add the missing braces for all but first and last
              if (i > 0) themeBlock = '{' + themeBlock;
              if (i < themeBlocks.length - 1) themeBlock = themeBlock + '}';
              
              try {
                // Fix common issues in each theme object
                themeBlock = themeBlock
                  .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Ensure property names are quoted
                  .replace(/:\s*'([^']*)'/g, ':"$1"');                // Replace single quotes with double quotes
                
                const themeObj = JSON.parse(themeBlock);
                themeObjects.push(themeObj);
              } catch (themeError) {
                console.error(`Error parsing theme ${i+1}:`, themeError.message);
                console.error(`Theme block: ${themeBlock}`);
                // Add a placeholder theme if parsing fails
                themeObjects.push({
                  week: i + 1,
                  theme: strategy.key_messages[i] ? 
                    `Week ${i + 1}: ${strategy.key_messages[i].substring(0, 30)}...` : 
                    `Week ${i + 1}: Fitness Content`
                });
              }
            }
            
            // Create the proper structure
            jsonData = {
              weeklyThemes: themeObjects.slice(0, 3) // Ensure we only have 3 themes
            };
            
            console.log("Successfully extracted themes array through manual parsing");
          } else {
            // If we can't extract themes pattern, try extracting any JSON object
            const jsonPattern = /\{[\s\S]*?\}/g;
            const matches = cleanedText.match(jsonPattern);
            
            if (matches && matches.length > 0) {
              console.log("Found JSON object in response, attempting to extract structure");
              
              // Try each potential JSON object until we find a valid one
              for (const match of matches) {
                try {
                  const potentialJson = JSON.parse(match);
                  if (potentialJson.weeklyThemes) {
                    jsonData = potentialJson;
                    console.log("Found valid weeklyThemes structure in JSON object");
                    break;
                  }
                } catch (err) {
                  // Continue to next match
                }
              }
              
              if (!jsonData) {
                throw new Error("No valid weeklyThemes structure found in JSON objects");
              }
            } else {
              throw new Error("Could not find weeklyThemes array or any JSON object in response");
            }
          }
        } catch (extractError) {
          console.error("Advanced parsing also failed:", extractError.message);
          
          // Last resort: create default themes based on key messages
          console.log("Creating default themes from key messages");
          const defaultThemes = [];
          for (let i = 0; i < 3; i++) {
            defaultThemes.push({
              week: i + 1,
              theme: strategy.key_messages[i] ? 
                `Week ${i + 1}: ${strategy.key_messages[i].substring(0, 30)}...` : 
                `Week ${i + 1}: Fitness Content`
            });
          }
          
          jsonData = { weeklyThemes: defaultThemes };
          throw new Error("Unable to extract valid JSON: " + parseError.message + ". Created default themes.");
        }
      }
      
      // Verify we have the right structure
      if (!jsonData.weeklyThemes) {
        console.warn("Response missing 'weeklyThemes' property, creating it");
        jsonData.weeklyThemes = [];
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
        
        // If we have themes but not 3, preserve what we have and fill the rest
        if (Array.isArray(jsonData.weeklyThemes) && jsonData.weeklyThemes.length > 0) {
          while (jsonData.weeklyThemes.length < 3) {
            const index = jsonData.weeklyThemes.length;
            jsonData.weeklyThemes.push(defaultThemes[index]);
          }
          
          // If we have more than 3, trim
          if (jsonData.weeklyThemes.length > 3) {
            jsonData.weeklyThemes = jsonData.weeklyThemes.slice(0, 3);
          }
        } else {
          jsonData.weeklyThemes = defaultThemes;
        }
      }
      
      // Validate and sanitize each theme object to ensure all fields exist
      jsonData.weeklyThemes = jsonData.weeklyThemes.map((theme, index) => {
        // Create a valid theme object with defaults for any missing fields
        return {
          week: theme.week || index + 1,
          theme: theme.theme || (strategy.key_messages[index] ? 
            `Week ${index + 1}: ${strategy.key_messages[index].substring(0, 30)}...` : 
            `Week ${index + 1}: Fitness Content`)
        };
      });
      
      console.log("Successfully parsed themes JSON");
      
      return res.status(200).json(jsonData);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      
      // Return error instead of fallback themes
      return res.status(500).json({ 
        error: `Failed to parse Gemini API response: ${parseError.message}`,
        details: "The API response could not be properly interpreted as JSON."
      });
    }
  } catch (error) {
    console.error('Error generating themes:', error);
    
    // Return error status and message instead of fallback content
    return res.status(500).json({ 
      error: `Failed to generate content themes: ${error.message}`,
      details: "Please try again later or check API key configuration."
    });
  }
} 