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
    
    // Check if we have the enhanced strategy data
    const hasEnhancedData = strategy.enhancedStrategy && 
                            strategy.enhancedStrategy.audiences && 
                            Array.isArray(strategy.enhancedStrategy.audiences) &&
                            strategy.enhancedStrategy.audiences.length > 0;

    // Create a more detailed prompt using the enhanced data if available
    let prompt;

    if (hasEnhancedData) {
      // Safely access audience data with fallbacks
      const audienceSegments = strategy.enhancedStrategy.audiences.map((audience, i) => {
        // Ensure all expected properties exist with fallbacks
        const painPoints = audience.painPoints && Array.isArray(audience.painPoints) 
          ? audience.painPoints.join(', ') 
          : 'Pain points not specified';
          
        const goals = audience.goals && Array.isArray(audience.goals) 
          ? audience.goals.join(', ') 
          : 'Goals not specified';
          
        const channels = audience.channels && Array.isArray(audience.channels) 
          ? audience.channels.join(', ') 
          : 'Channels not specified';
          
        const decisionFactors = audience.decisionFactors && Array.isArray(audience.decisionFactors) 
          ? audience.decisionFactors.join(', ') 
          : 'Decision factors not specified';
          
        return `${i+1}. ${audience.segment || `Audience Segment ${i+1}`}
           - Pain Points: ${painPoints}
           - Goals: ${goals}
           - Preferred Channels: ${channels}
           - Decision Factors: ${decisionFactors}`;
      }).join('\n\n');
      
      // Safely access content strategy data with fallbacks
      const contentTone = strategy.enhancedStrategy.contentStrategy?.tone || 'Professional and approachable';
      const brandValues = Array.isArray(strategy.enhancedStrategy.contentStrategy?.brandValues) 
        ? strategy.enhancedStrategy.contentStrategy.brandValues.join(', ')
        : 'Trust, expertise, results';
      const campaignGoals = Array.isArray(strategy.enhancedStrategy.contentStrategy?.campaignGoals)
        ? strategy.enhancedStrategy.contentStrategy.campaignGoals.join(', ')
        : 'Increase awareness, build credibility, drive conversions';
        
      // Safely access competitive gaps data with fallbacks
      const competitiveGapsContent = strategy.enhancedStrategy.competitiveGaps?.identifiedGaps && 
                                   Array.isArray(strategy.enhancedStrategy.competitiveGaps.identifiedGaps)
        ? strategy.enhancedStrategy.competitiveGaps.identifiedGaps.map((gap, i) => {
            const strategy = Array.isArray(strategy.enhancedStrategy.competitiveGaps.exploitationStrategies) && 
                          strategy.enhancedStrategy.competitiveGaps.exploitationStrategies[i]
              ? strategy.enhancedStrategy.competitiveGaps.exploitationStrategies[i]
              : 'Highlight this gap';
            
            return `- ${gap}: ${strategy}`;
          }).join('\n')
        : '- Personalized approach: Highlight personal attention in all content\n- Community focus: Showcase supportive community aspects';
      
      prompt = `
        You are a fitness content strategy expert. Create a strategic 3-week content plan with themes that target specific audience segments.
        
        BUSINESS DETAILS:
        "${strategy.business_description || 'Fitness business'}"
        
        AUDIENCE SEGMENTS (3):
        ${audienceSegments}
        
        CONTENT STRATEGY GUIDELINES:
        - Tone of Voice: ${contentTone}
        - Brand Values: ${brandValues}
        - Campaign Goals: ${campaignGoals}
        
        COMPETITIVE GAPS TO EXPLOIT:
        ${competitiveGapsContent}
        
        IMPLEMENTATION TIMELINE - 3 WEEK CAMPAIGN:
        Phase 1 (Week 1): Awareness - Introduce value proposition and build brand recognition
        Phase 2 (Week 2): Consideration - Demonstrate expertise and address objections
        Phase 3 (Week 3): Conversion - Drive specific actions and provide clear next steps
        
        TASK:
        Create 3 weekly content themes where:
        1. Each week targets a different audience segment (assign Week 1 to audience segment 1, Week 2 to segment 2, Week 3 to segment 3)
        2. Each theme aligns with the appropriate timeline phase (awareness, consideration, conversion)
        3. Each theme includes a specific, actionable objective that provides a clear metric for success
        4. Themes should leverage the competitive gaps identified
        
        For each week, provide:
        1. A specific theme title (8-12 words that captures the essence of content focus)
        2. A specific objective for that week (should be actionable and measurable)
        3. The target audience segment (specify which of the 3 segments this week focuses on)
        
        RESPOND WITH A JSON OBJECT IN THIS EXACT FORMAT WITHOUT ANY EXPLANATION OR MARKDOWN:
        {
          "weeklyThemes": [
            {
              "week": 1,
              "theme": "Theme title focusing on awareness for segment 1",
              "objective": "Specific measurable objective for Week 1",
              "targetSegment": "Name of audience segment 1",
              "phase": "Awareness"
            },
            {
              "week": 2,
              "theme": "Theme title focusing on consideration for segment 2",
              "objective": "Specific measurable objective for Week 2",
              "targetSegment": "Name of audience segment 2",
              "phase": "Consideration"
            },
            {
              "week": 3,
              "theme": "Theme title focusing on conversion for segment 3",
              "objective": "Specific measurable objective for Week 3",
              "targetSegment": "Name of audience segment 3",
              "phase": "Conversion"
            }
          ]
        }
      `;
    } else {
      // Use the original prompt if enhanced data isn't available
      prompt = `
        Generate three weekly content themes for a fitness business social media campaign.
        
        BUSINESS: "${strategy.business_description || 'Fitness business'}"
        
        TARGET AUDIENCE:
        ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
        
        OBJECTIVES:
        ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
        
        KEY MESSAGES:
        ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
        
        IMPLEMENTATION TIMELINE - 3 WEEK CAMPAIGN:
        Phase 1 (Week 1): Awareness - Introduce value proposition and build brand recognition
        Phase 2 (Week 2): Consideration - Demonstrate expertise and address objections
        Phase 3 (Week 3): Conversion - Drive specific actions and provide clear next steps
        
        For each week, provide:
        1. A specific theme that matches one of the key messages and aligns with the week's phase
        2. A specific objective for the week that supports the business goals and is actionable/measurable
        
        Respond with a JSON object in this exact format:
        {"weeklyThemes":[
          {"week":1,"theme":"Theme for Week 1","objective":"Specific objective for Week 1", "phase":"Awareness"},
          {"week":2,"theme":"Theme for Week 2","objective":"Specific objective for Week 2", "phase":"Consideration"},
          {"week":3,"theme":"Theme for Week 3","objective":"Specific objective for Week 3", "phase":"Conversion"}
        ]}
      `;
    }
    
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
          console.log("Attempting to extract themes directly from response text");
          let extractedThemes = extractThemesFromText(text);
          
          if (extractedThemes.length > 0) {
            console.log(`Successfully extracted ${extractedThemes.length} themes from text`);
            
            // Process themes to ensure consistent structure
            const finalThemes = extractedThemes.map((theme, index) => {
              // Default phases if not specified
              const defaultPhases = ["Awareness", "Consideration", "Conversion"];
              
              return {
                week: theme.week || index + 1,
                theme: theme.theme || `Theme for Week ${index + 1}`,
                objective: theme.objective || getCustomerAction(index, strategy),
                targetSegment: theme.targetSegment || (
                  hasEnhancedData && strategy.enhancedStrategy.audiences[index] ? 
                  strategy.enhancedStrategy.audiences[index].segment : ""
                ),
                phase: theme.phase || defaultPhases[index] || ""
              };
            });

            // Sort by week number to ensure correct order
            const sortedThemes = finalThemes.sort((a, b) => a.week - b.week);

            // Return exactly 3 themes, adding defaults if needed
            const validThemes = [];
            for (let i = 0; i < 3; i++) {
              if (sortedThemes[i]) {
                validThemes.push(sortedThemes[i]);
              } else {
                // Default phases
                const defaultPhases = ["Awareness", "Consideration", "Conversion"];
                
                validThemes.push({
                  week: i + 1,
                  theme: `Theme for Week ${i + 1}`,
                  objective: getCustomerAction(i, strategy),
                  targetSegment: hasEnhancedData && strategy.enhancedStrategy.audiences[i] ? 
                                strategy.enhancedStrategy.audiences[i].segment : "",
                  phase: defaultPhases[i] || ""
                });
              }
            }
            
            // FIX: Use consistent response format with weeklyThemes array
            return res.status(200).json({ weeklyThemes: validThemes });
          }
        } catch (extractError) {
          console.error("Error during theme extraction:", extractError);
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
        
        // Last resort: create default themes
        console.log("Creating default themes from key messages");
        const defaultThemes = [];
        for (let i = 0; i < 3; i++) {
          // Default phases
          const defaultPhases = ["Awareness", "Consideration", "Conversion"];
          
          defaultThemes.push({
            week: i + 1,
            theme: strategy.key_messages[i] ? 
              `${strategy.key_messages[i].substring(0, 30)}...` : 
              `Fitness Content for Week ${i + 1}`,
            objective: strategy.objectives[i % strategy.objectives.length] || 
              `Increase engagement through focused content for week ${i+1}`,
            targetSegment: hasEnhancedData && strategy.enhancedStrategy.audiences[i] ? 
              strategy.enhancedStrategy.audiences[i].segment : "",
            phase: defaultPhases[i] || ""
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
      
      // Before returning the final result, make sure we have the expected structure
      const finalThemes = jsonData.weeklyThemes.map((theme, index) => {
        // Default phases if not specified
        const defaultPhases = ["Awareness", "Consideration", "Conversion"];
        
        return {
          week: theme.week || index + 1,
          theme: theme.theme || `Theme for Week ${index + 1}`,
          objective: theme.objective || getCustomerAction(index, strategy),
          targetSegment: theme.targetSegment || "", // Include targetSegment
          phase: theme.phase || defaultPhases[index] || "" // Include phase
        };
      });

      // Sort by week number to ensure correct order
      const sortedThemes = finalThemes.sort((a, b) => a.week - b.week);

      // Return exactly 3 themes, adding defaults if needed
      const validThemes = [];
      for (let i = 0; i < 3; i++) {
        if (sortedThemes[i]) {
          validThemes.push(sortedThemes[i]);
        } else {
          // Default phases
          const defaultPhases = ["Awareness", "Consideration", "Conversion"];
          
          validThemes.push({
            week: i + 1,
            theme: `Theme for Week ${i + 1}`,
            objective: getCustomerAction(i, strategy),
            targetSegment: hasEnhancedData && strategy.enhancedStrategy.audiences[i] ? 
                          strategy.enhancedStrategy.audiences[i].segment : "",
            phase: defaultPhases[i] || ""
          });
        }
      }
      
      // FIX: Use consistent response format with weeklyThemes array
      return res.status(200).json({ weeklyThemes: validThemes });
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
    
    // Add more detailed error logging to help diagnose issues
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      responseFormat: error.responseFormat || 'not available',
      apiError: error.apiError || 'not available'
    });
    
    // Return error status and message with more details
    return res.status(500).json({ 
      error: `Failed to generate content themes: ${error.message}`,
      details: "Please try again later or check API key configuration.",
      errorSource: error.stack ? error.stack.split('\n')[1] : 'unknown source'
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
  console.log("Attempting to extract themes from text...");
  
  // First, try to find a complete weeklyThemes array
  const arrayMatch = text.match(/\{\s*"weeklyThemes"\s*:\s*\[([\s\S]*?)\]\s*\}/i);
  if (arrayMatch && arrayMatch[1]) {
    console.log("Found weeklyThemes array structure");
    
    const itemsText = arrayMatch[1];
    // Find individual theme objects
    const themeMatches = [...itemsText.matchAll(/\{\s*"week"\s*:\s*(\d+)\s*,\s*"theme"\s*:\s*"([^"]+)"\s*,\s*"objective"\s*:\s*"([^"]+)"(?:\s*,\s*"targetSegment"\s*:\s*"([^"]+)")?(?:\s*,\s*"phase"\s*:\s*"([^"]+)")?\s*\}/gi)];
    
    if (themeMatches.length > 0) {
      console.log(`Found ${themeMatches.length} theme objects in array`);
      
      return themeMatches.map(match => {
        return {
          week: parseInt(match[1]),
          theme: match[2],
          objective: match[3],
          targetSegment: match[4] || "",  // Extract targetSegment if present
          phase: match[5] || ""           // Extract phase if present
        };
      }).sort((a, b) => a.week - b.week);
    }
  }
  
  // If we couldn't find a structured array, try to find individual week objects
  console.log("Attempting to find individual week objects...");
  const weekMatches = [
    ...text.matchAll(/week\s*:?\s*(\d+)[^\n]*?theme\s*:?\s*["']([^"']+)["'][^\n]*?objective\s*:?\s*["']([^"']+)["'](?:[^\n]*?targetSegment\s*:?\s*["']([^"']+)["'])?(?:[^\n]*?phase\s*:?\s*["']([^"']+)["'])?/gi),
  ];
  
  if (weekMatches.length > 0) {
    console.log(`Found ${weekMatches.length} individual week patterns`);
    
    return weekMatches.map(match => {
      return {
        week: parseInt(match[1]),
        theme: match[2],
        objective: match[3],
        targetSegment: match[4] || "",  // Extract targetSegment if present
        phase: match[5] || ""           // Extract phase if present
      };
    }).sort((a, b) => a.week - b.week);
  }
  
  // If still nothing, look for more loosely formatted week content
  console.log("Attempting to find loosely formatted week content...");
  const looseWeekMatches = [
    ...text.matchAll(/Week\s*(\d+)\s*(?:[-:])?\s*(?:Theme\s*(?:[-:])?\s*)?["']?([^"'\n,]+(?:[^"\n,]+[^"'\n,]+)*)["']?\s*(?:[-:])?\s*(?:Objective\s*(?:[-:])?\s*)?["']?([^"'\n,]+(?:[^"\n,]+[^"'\n,]+)*)["']?/gi),
  ];
  
  if (looseWeekMatches.length > 0) {
    console.log(`Found ${looseWeekMatches.length} loose week patterns`);
    
    // Also look for target segments if mentioned separately
    const segmentMatches = [
      ...text.matchAll(/Week\s*(\d+)[^\n]*?(?:Target|Audience|Segment)\s*(?:[-:])?\s*["']?([^"'\n,]+(?:[^"\n,]+[^"'\n,]+)*)["']?/gi),
    ];
    
    // Create a map of week number to segment
    const segmentMap = {};
    segmentMatches.forEach(match => {
      segmentMap[parseInt(match[1])] = match[2].trim();
    });
    
    // Also look for phases if mentioned separately
    const phaseMatches = [
      ...text.matchAll(/Week\s*(\d+)[^\n]*?(?:Phase)\s*(?:[-:])?\s*["']?([^"'\n,]+(?:[^"\n,]+[^"'\n,]+)*)["']?/gi),
    ];
    
    // Create a map of week number to phase
    const phaseMap = {};
    phaseMatches.forEach(match => {
      phaseMap[parseInt(match[1])] = match[2].trim();
    });
    
    // Map the standard phases to week numbers if not found
    if (Object.keys(phaseMap).length === 0) {
      phaseMap[1] = "Awareness";
      phaseMap[2] = "Consideration";
      phaseMap[3] = "Conversion";
    }
    
    return looseWeekMatches.map(match => {
      const weekNum = parseInt(match[1]);
      return {
        week: weekNum,
        theme: match[2].trim(),
        objective: match[3].trim(),
        targetSegment: segmentMap[weekNum] || "",
        phase: phaseMap[weekNum] || ""
      };
    }).sort((a, b) => a.week - b.week);
  }
  
  // Return empty array if nothing was found
  console.log("Could not extract themes, returning empty array");
  return [];
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