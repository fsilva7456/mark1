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
      temperature: 0.3, // Lower temperature for more predictable formatting
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
    
    // Simplify the prompt to reduce chances of malformed JSON
    const prompt = `
      Create 3 weekly content themes for a fitness social media campaign, each with a specific objective.

      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      ${aesthetic ? `AESTHETIC/STYLE: "${aesthetic}"` : ''}
      
      For each week:
      1. Create a theme that matches one of the key messages (8-12 words)
      2. Assign a specific, focused objective for that week's content that describes EXACTLY what you want customers to DO
      
      IMPORTANT: 
      - Avoid using quotes or special characters in your response that could break JSON syntax
      - Each week should have a different objective focusing on specific customer ACTIONS or BEHAVIORS
      - Make the objectives clear, actionable, and measurable - what should customers DO after seeing this content?
      - Objectives should start with action verbs (Book, Download, Try, Sign up, Share, Tag, etc.)
      - Examples: "Sign up for a free trial class", "Download our workout guide", "Tag a friend in comments", "Book a consultation"
      
      RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
      {"weeklyThemes":[
        {"week":1,"theme":"Theme for Week 1","objective":"Specific customer action for Week 1"},
        {"week":2,"theme":"Theme for Week 2","objective":"Specific customer action for Week 2"},
        {"week":3,"theme":"Theme for Week 3","objective":"Specific customer action for Week 3"}
      ]}
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
      
      // Extremely aggressive JSON cleaning with focus on string termination
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\\n/g, ' ')    // Replace newlines with spaces
        .replace(/\\"/g, '"')    // Fix escaped quotes
        .replace(/\\\\/g, '\\'); // Fix double escapes
      
      // Fix JSON syntax issues
      cleanedText = cleanedText
        .replace(/,\s*}/g, '}')          // Remove trailing commas in objects
        .replace(/,\s*\]/g, ']')         // Remove trailing commas in arrays
        .replace(/(['"])\s*:\s*/g, '$1:'); // Normalize spacing around colons
      
      // Fix unterminated strings - a common issue in large JSON responses
      // This regex finds strings that are missing a closing quote
      cleanedText = fixUnterminatedStrings(cleanedText);
      
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
          // Raw text extraction approach - extract anything that looks like a theme
          const extractedThemes = extractThemesFromText(text);
          
          if (extractedThemes && extractedThemes.length > 0) {
            jsonData = { weeklyThemes: extractedThemes };
            console.log(`Successfully extracted ${extractedThemes.length} themes through text pattern matching`);
          } else {
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
                    .replace(/:\s*'([^']*)'/g, ':"$1"')                 // Replace single quotes with double quotes
                    .replace(/([^\\])"([^"]*?)([^\\])"/g, '$1"$2$3"');  // Fix nested quotes
                  
                  // Try to balance quotes in the theme block
                  themeBlock = fixUnterminatedStrings(themeBlock);
                  
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
                      `Week ${i + 1}: Fitness Content`,
                    objective: strategy.objectives[i % strategy.objectives.length] || 
                      `Increase engagement through focused content for week ${i+1}`
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
                `Week ${i + 1}: Fitness Content`,
              objective: strategy.objectives[i % strategy.objectives.length] || 
                `Increase engagement through focused content for week ${i+1}`
            });
          }
          
          jsonData = { weeklyThemes: defaultThemes };
          console.log("Created default themes due to parsing failure");
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
              `Week ${i + 1}: Fitness Content`,
            objective: strategy.objectives[i % strategy.objectives.length] || 
              `Increase engagement through focused content for week ${i+1}`
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
        const objectiveDefault = strategy.objectives[index % strategy.objectives.length] || 
          `Increase engagement through ${strategy.key_messages[index % strategy.key_messages.length] || 'fitness content'}`;
        
        // Create a valid theme object with defaults for any missing fields
        return {
          week: theme.week || index + 1,
          theme: theme.theme || (strategy.key_messages[index] ? 
            `Week ${index + 1}: ${strategy.key_messages[index].substring(0, 30)}...` : 
            `Week ${index + 1}: Fitness Content`),
          objective: theme.objective || objectiveDefault
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

// ADD THESE UTILITY FUNCTIONS AT THE END OF THE FILE
// Helper function to fix unterminated strings in JSON
function fixUnterminatedStrings(jsonText) {
  // This is a simplified approach - in production, a more robust parser would be better
  let fixed = jsonText;
  
  // Detect and fix unterminated strings in JSON properties and values
  // This regex finds property values that start with a quote but don't end with one before the next property or end of object
  fixed = fixed.replace(/("([^"\\]|\\.)*)((?=,\s*")|(?=\s*}))/g, '$1"$3');
  
  // Fix unterminated strings at the end of the content
  if (fixed.match(/"([^"\\]|\\.)*$/)) {
    fixed = fixed + '"';
  }
  
  return fixed;
}

// Extract themes from text using pattern matching when JSON parsing fails completely
function extractThemesFromText(text) {
  const themes = [];
  
  // Look for week numbers, themes, and objectives in the text using various patterns
  const weekMatches = text.match(/week"?\s*:\s*(\d+)/g) || [];
  const themeMatches = text.match(/theme"?\s*:\s*"([^"]+)"/g) || [];
  const objectiveMatches = text.match(/objective"?\s*:\s*"([^"]+)"/g) || [];
  
  // If we have both week numbers and themes
  if (weekMatches.length > 0 && themeMatches.length > 0) {
    // Use the smallest count to determine how many themes we can extract
    const count = Math.min(weekMatches.length, themeMatches.length);
    
    for (let i = 0; i < count; i++) {
      // Extract the week number
      const weekMatch = weekMatches[i].match(/(\d+)/);
      const week = weekMatch ? parseInt(weekMatch[1]) : i + 1;
      
      // Extract the theme
      const themeMatch = themeMatches[i].match(/:\s*"([^"]*)"/);
      const theme = themeMatch ? themeMatch[1] : `Fitness Content for Week ${i + 1}`;
      
      // Extract the objective or use default
      const objectiveMatch = i < objectiveMatches.length ? objectiveMatches[i].match(/:\s*"([^"]*)"/): null;
      const objective = objectiveMatch ? objectiveMatch[1] : 
        `${getActionVerb()} ${getCustomerAction(i, strategy)}`;
      
      themes.push({ week, theme, objective });
    }
  } else {
    // Fallback - look for any week-like patterns in the text
    const weekTextPattern = /Week\s+(\d+)[\s:]+([^\.]+)/gi;
    let match;
    
    while ((match = weekTextPattern.exec(text)) !== null) {
      const week = parseInt(match[1]);
      const theme = match[2].trim();
      
      // Only add if we have both week number and theme text
      if (week && theme) {
        const objective = `${getActionVerb()} ${getCustomerAction(week-1, strategy)}`;
        
        themes.push({ week, theme, objective });
      }
    }
  }
  
  // If we have found any themes, ensure they're ordered correctly
  if (themes.length > 0) {
    // Sort by week number
    themes.sort((a, b) => a.week - b.week);
    
    // Ensure we have exactly 3 themes
    while (themes.length < 3) {
      const week = themes.length + 1;
      themes.push({
        week,
        theme: strategy.key_messages[week - 1] ? 
          `${strategy.key_messages[week - 1].substring(0, 30)}...` : 
          `Fitness Content for Week ${week}`,
        objective: strategy.objectives[(week-1) % strategy.objectives.length] || 
          `Increase engagement through focused content for week ${week}`
      });
    }
    
    // If we have more than 3, keep only the first 3
    if (themes.length > 3) {
      themes.splice(3);
    }
  }
  
  return themes;
}

// Add these new utility functions to improve the fallback objectives
function getActionVerb() {
  const verbs = [
    "Book", "Schedule", "Sign up for", "Register for", "Join", "Attend", 
    "Download", "Try", "Start", "Implement", "Follow", "Share", "Tag", 
    "Comment on", "Save", "Like", "Subscribe to", "Contact us about"
  ];
  return verbs[Math.floor(Math.random() * verbs.length)];
}

function getCustomerAction(index, strategy) {
  // Create specific customer actions based on the strategy
  const actions = [
    "a free consultation to discuss fitness goals",
    "our beginner-friendly fitness class",
    "the 7-day meal plan",
    "workout routines with a friend",
    "our fitness challenge",
    "a personal training session",
    "our workout guide PDF",
    "implementing one new healthy habit",
    "our fitness app",
    "a friend who would enjoy our content",
    "with your own fitness journey story",
    "this post for future reference",
    "us for daily motivation",
    "your fitness questions in the comments"
  ];
  
  // Use key messages or objectives if available to make actions more specific
  if (strategy.key_messages && strategy.key_messages.length > 0) {
    const message = strategy.key_messages[index % strategy.key_messages.length];
    return extractActionFromMessage(message, actions[index % actions.length]);
  }
  
  return actions[index % actions.length];
}

function extractActionFromMessage(message, fallback) {
  // Try to generate a more targeted action based on the message
  if (!message) return fallback;
  
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes("class") || messageLower.includes("session")) {
    return "a fitness class to experience our approach firsthand";
  } else if (messageLower.includes("meal") || messageLower.includes("nutrition") || messageLower.includes("diet")) {
    return "our customized meal planning service";
  } else if (messageLower.includes("consult") || messageLower.includes("advice")) {
    return "a free consultation with our fitness experts";
  } else if (messageLower.includes("plan") || messageLower.includes("program")) {
    return "our structured fitness program";
  } else if (messageLower.includes("community") || messageLower.includes("group")) {
    return "our fitness community and attend a group session";
  } else if (messageLower.includes("transform") || messageLower.includes("change")) {
    return "our transformation challenge and track your progress";
  } else if (messageLower.includes("guide") || messageLower.includes("resource")) {
    return "our fitness resource guide and implement one tip";
  }
  
  return fallback;
} 