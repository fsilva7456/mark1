import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { strategy, weekNumber, weekTheme, allThemes, aesthetic } = req.body;
    
    if (!strategy || !weekNumber || !weekTheme) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        received: JSON.stringify({ strategy: !!strategy, weekNumber, weekTheme, allThemes: !!allThemes, aesthetic: !!aesthetic })
      });
    }
    
    // Extract the week's objective - it could come from the allThemes or as a separate parameter
    const weekObjective = (allThemes && allThemes[weekNumber-1] && allThemes[weekNumber-1].objective) || 
                          req.body.weekObjective || 
                          (strategy.objectives && strategy.objectives[(weekNumber-1) % strategy.objectives.length]) ||
                          `Engage audience with valuable fitness content`;
    
    console.log(`Week ${weekNumber} objective:`, weekObjective);
    
    // Check weekNumber is valid
    if (weekNumber < 1 || weekNumber > 3) {
      return res.status(400).json({ error: 'Week number must be between 1 and 3' });
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
      temperature: 0.4, // Reduce temperature for more predictable formatting
      maxOutputTokens: 800,
    };
    
    // Update to use the 2.0 model
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
      Create 3 social media posts for Week ${weekNumber} of a fitness content plan.

      WEEK THEME: "${weekTheme}"
      
      WEEK OBJECTIVE: "${weekObjective}"
      
      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      ${aesthetic ? `AESTHETIC/STYLE: "${aesthetic}"` : ''}
      
      ${allThemes ? `CONTENT PLAN CONTEXT:
      Week 1: "${allThemes[0].theme}" - Objective: "${allThemes[0].objective || 'Engage audience'}"
      Week 2: "${allThemes[1].theme}" - Objective: "${allThemes[1].objective || 'Provide value'}"
      Week 3: "${allThemes[2].theme}" - Objective: "${allThemes[2].objective || 'Drive action'}"
      ` : ''}
      
      Focus all posts on achieving this week's specific objective. Make sure each post contributes directly to the week's objective.
      
      Each post must include these fields:
      - type (choose from: Carousel, Video, Reel, Story, Image)
      - topic (12-20 words describing the specific objective of the post)
      - audience (2-3 sentences describing the target audience)
      - cta (call to action, 10-15 words)
      - principle (one persuasion principle)
      - principleExplanation (1 short sentence only)
      - visual (5-8 words description)
      - proposedCaption (50-75 words with hashtags)
      
      IMPORTANT: Avoid using quotes or special characters in your response that could break JSON syntax.
      
      RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
      {"posts":[{"type":"","topic":"","audience":"","cta":"","principle":"","principleExplanation":"","visual":"","proposedCaption":""}]}
    `;
    
    console.log(`Generating content for Week ${weekNumber}: ${weekTheme}`);
    
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
        console.log("Week data:", JSON.stringify({
          weekNumber,
          weekTheme,
          has_allThemes: !!allThemes,
          has_business_desc: !!strategy.business_description,
          target_audience_count: strategy.target_audience?.length || 0,
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
          throw new Error(`Gemini API error for week ${weekNumber}: ${apiError.message}`);
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
      console.log(`Week ${weekNumber} response preview:`, text.substring(0, 100) + "...");
      console.log(`Week ${weekNumber} full response:`, text); // Log full response for debugging
      
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
        console.log(`Week ${weekNumber} JSON parsed successfully`);
      } catch (parseError) {
        console.error(`Error parsing Week ${weekNumber} JSON:`, parseError.message);
        console.error(`Position: ${parseError.message.match(/position (\d+)/)?.[1] || 'unknown'}`);
        
        // More aggressive cleanup for malformed JSON
        console.log("Attempting more aggressive JSON cleanup...");
        
        // Try to extract each post individually
        try {
          // Raw text extraction approach - extract anything that looks like a post
          const extractedPosts = extractPostsFromText(text);
          
          if (extractedPosts && extractedPosts.length > 0) {
            jsonData = { posts: extractedPosts.slice(0, 3) };
            console.log(`Successfully extracted ${extractedPosts.length} posts through text pattern matching`);
          } else {
            // Fallback to structured extraction
            const postsPattern = /"posts"\s*:\s*\[([\s\S]*?)\]/g;
            const postsMatch = postsPattern.exec(cleanedText);
            
            if (postsMatch && postsMatch[1]) {
              // Try to parse just the posts array
              const postsContent = postsMatch[1].trim();
              
              // Build posts objects individually
              const postObjects = [];
              const postBlocks = postsContent.split(/},{/);
              
              for (let i = 0; i < postBlocks.length; i++) {
                let postBlock = postBlocks[i];
                // Add the missing braces for all but first and last
                if (i > 0) postBlock = '{' + postBlock;
                if (i < postBlocks.length - 1) postBlock = postBlock + '}';
                
                try {
                  // Fix common issues in each post object
                  postBlock = postBlock
                    .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Ensure property names are quoted
                    .replace(/:\s*'([^']*)'/g, ':"$1"')                 // Replace single quotes with double quotes
                    .replace(/([^\\])"([^"]*?)([^\\])"/g, '$1"$2$3"');  // Fix nested quotes
                  
                  // Try to balance quotes in the post block
                  postBlock = fixUnterminatedStrings(postBlock);
                  
                  const postObj = JSON.parse(postBlock);
                  postObjects.push(postObj);
                } catch (postError) {
                  console.error(`Error parsing post ${i+1}:`, postError.message);
                  console.error(`Post block: ${postBlock}`);
                  // Add a placeholder post if parsing fails
                  postObjects.push({
                    type: "Image",
                    topic: `${weekTheme} tips (placeholder due to parsing error)`,
                    audience: "Fitness enthusiasts looking to improve their routines",
                    cta: "Follow for more fitness tips",
                    principle: "Authority",
                    principleExplanation: "People trust expert advice",
                    visual: "Professional fitness demonstration",
                    proposedCaption: `Week ${weekNumber} fitness content. #Fitness #Wellness`
                  });
                }
              }
              
              // Create the proper structure
              jsonData = {
                posts: postObjects.slice(0, 3) // Ensure we only have 3 posts
              };
              
              console.log("Successfully extracted posts array through manual parsing");
            } else {
              throw new Error("Could not find posts array in response");
            }
          }
        } catch (extractError) {
          console.error("Advanced parsing also failed:", extractError.message);
          
          // Last resort: create generic posts
          const defaultPosts = [];
          for (let i = 0; i < 3; i++) {
            defaultPosts.push({
              type: ["Carousel", "Video", "Reel"][i % 3],
              topic: `${weekTheme} fitness tips (part ${i+1})`,
              audience: `${strategy.target_audience[i % strategy.target_audience.length] || "Fitness enthusiasts"}`,
              cta: "Save this post for your next workout",
              principle: ["Social Proof", "Authority", "Scarcity"][i % 3],
              principleExplanation: "This principle drives engagement and action",
              visual: "Professional fitness demonstration",
              proposedCaption: `Week ${weekNumber} fitness content. This post will help you achieve your fitness goals. #Fitness #Wellness`
            });
          }
          
          jsonData = { posts: defaultPosts };
          console.log("Created default posts due to parsing failure");
        }
      }
      
      // Verify we have the right structure and posts array
      if (!jsonData.posts || !Array.isArray(jsonData.posts)) {
        console.warn("Response missing 'posts' array, creating empty posts array");
        jsonData.posts = [];
      }
      
      // Ensure we have exactly 3 posts
      if (jsonData.posts.length !== 3) {
        console.warn(`Invalid posts count (${jsonData.posts.length}), adjusting structure...`);
        
        // If we have too few posts, add defaults
        while (jsonData.posts.length < 3) {
          jsonData.posts.push({
            type: ["Carousel", "Video", "Reel"][jsonData.posts.length % 3],
            topic: `${weekTheme} comprehensive guide to transform your fitness routine with expert insights`,
            audience: `${strategy.target_audience[jsonData.posts.length % strategy.target_audience.length] || "Fitness enthusiasts"} who struggle with consistency and need structured guidance. They're motivated but overwhelmed by conflicting information, seeking proven methods that fit their lifestyle.`,
            cta: "Save this guide and tag a friend who needs these proven strategies",
            principle: "Social Proof",
            principleExplanation: "People tend to follow what others are doing.",
            visual: "Professionally designed infographics with step-by-step demonstrations",
            proposedCaption: `Week ${weekNumber} content for your fitness journey. This post helps you achieve your fitness goals with our expert guidance. #Fitness #HealthyLiving`
          });
        }
        
        // If we have too many, trim
        if (jsonData.posts.length > 3) {
          jsonData.posts = jsonData.posts.slice(0, 3);
        }
      }
      
      // Validate and sanitize each post object to ensure all fields exist
      jsonData.posts = jsonData.posts.map((post, index) => {
        // Create a valid post object with defaults for any missing fields
        return {
          type: post.type || ["Carousel", "Video", "Reel"][index % 3],
          topic: post.topic || `${weekTheme} fitness content (part ${index + 1})`,
          audience: post.audience || "Fitness enthusiasts looking to improve their routines",
          cta: post.cta || "Follow for more fitness tips",
          principle: post.principle || "Authority",
          principleExplanation: post.principleExplanation || "People trust expert advice",
          visual: post.visual || "Professional fitness demonstration",
          proposedCaption: post.proposedCaption || `Week ${weekNumber} fitness content. #Fitness #Wellness`
        };
      });
      
      // Add the week data to the response
      const weekContent = {
        week: weekNumber,
        theme: weekTheme,
        objective: weekObjective,
        posts: jsonData.posts
      };
      
      console.log(`Successfully generated content for Week ${weekNumber}`);
      
      return res.status(200).json({ weekContent });
    } catch (parseError) {
      console.error(`Error processing Week ${weekNumber} response:`, parseError);
      
      // Return error instead of fallback content
      return res.status(500).json({ 
        error: `Failed to parse Week ${weekNumber} response: ${parseError.message}`,
        details: "The API response could not be properly parsed as JSON."
      });
    }
  } catch (error) {
    console.error('Error generating week content:', error);
    
    // Return error status and message instead of fallback content
    return res.status(500).json({ 
      error: `Failed to generate week ${req.body.weekNumber} content: ${error.message}`,
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

// Extract posts from text using pattern matching when JSON parsing fails completely
function extractPostsFromText(text) {
  const posts = [];
  
  // Look for post-like structures in the text
  const typeMatches = text.match(/type"?\s*:\s*"([^"]+)"/g) || [];
  const topicMatches = text.match(/topic"?\s*:\s*"([^"]+)"/g) || [];
  const audienceMatches = text.match(/audience"?\s*:\s*"([^"]+)"/g) || [];
  const ctaMatches = text.match(/cta"?\s*:\s*"([^"]+)"/g) || [];
  const principleMatches = text.match(/principle"?\s*:\s*"([^"]+)"/g) || [];
  const principleExplanationMatches = text.match(/principleExplanation"?\s*:\s*"([^"]+)"/g) || [];
  const visualMatches = text.match(/visual"?\s*:\s*"([^"]+)"/g) || [];
  const captionMatches = text.match(/proposedCaption"?\s*:\s*"([^"]+)"/g) || [];
  
  // Get the count of the most common property to determine how many posts we have
  const counts = [
    typeMatches.length,
    topicMatches.length, 
    audienceMatches.length,
    ctaMatches.length,
    principleMatches.length, 
    principleExplanationMatches.length,
    visualMatches.length,
    captionMatches.length
  ];
  
  // Find the most frequent count that's not 0
  const nonZeroCounts = counts.filter(c => c > 0);
  const postCount = nonZeroCounts.length > 0 ? Math.min(...nonZeroCounts) : 0;
  
  // Extract the values based on the detected pattern
  for (let i = 0; i < postCount; i++) {
    const post = {
      type: extractValue(typeMatches[i] || 'type:"Image"'),
      topic: extractValue(topicMatches[i] || `topic:"${weekTheme} content"`),
      audience: extractValue(audienceMatches[i] || 'audience:"Fitness enthusiasts"'),
      cta: extractValue(ctaMatches[i] || 'cta:"Follow for more tips"'),
      principle: extractValue(principleMatches[i] || 'principle:"Authority"'),
      principleExplanation: extractValue(principleExplanationMatches[i] || 'principleExplanation:"Builds trust"'),
      visual: extractValue(visualMatches[i] || 'visual:"Fitness demonstration"'),
      proposedCaption: extractValue(captionMatches[i] || 'proposedCaption:"Fitness content #fitness"')
    };
    
    posts.push(post);
  }
  
  // If we couldn't extract posts by pattern matching, return empty array
  if (posts.length === 0) {
    return [];
  }
  
  return posts;
}

// Helper to extract value from a key:value string
function extractValue(propertyString) {
  const match = propertyString.match(/:\s*"([^"]*)"/);
  return match ? match[1] : "";
} 