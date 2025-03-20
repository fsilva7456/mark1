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
      temperature: 0.5,
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
    
    // Construct a prompt for just this week's content
    const prompt = `
      Create 3 social media posts for Week ${weekNumber} of a fitness content plan.

      WEEK THEME: "${weekTheme}"
      
      BUSINESS: "${strategy.business_description || 'Fitness business'}"
      
      TARGET AUDIENCE:
      ${strategy.target_audience.map((audience, i) => `${i+1}. "${audience}"`).join('\n')}
      
      OBJECTIVES:
      ${strategy.objectives.map((objective, i) => `${i+1}. "${objective}"`).join('\n')}
      
      KEY MESSAGES:
      ${strategy.key_messages.map((message, i) => `${i+1}. "${message}"`).join('\n')}
      
      ${aesthetic ? `AESTHETIC/STYLE: "${aesthetic}"` : ''}
      
      ${allThemes ? `CONTENT PLAN CONTEXT:
      Week 1: "${allThemes[0].theme}"
      Week 2: "${allThemes[1].theme}"
      Week 3: "${allThemes[2].theme}"
      ` : ''}
      
      Each post must have:
      - type (choose from: Carousel, Video, Reel, Story, Image)
      - topic (DETAILED: 12-20 words describing the specific objective of the post with a compelling title. Be specific and descriptive about what the post will achieve, why it matters, and use powerful language that attracts attention)
      - audience (DETAILED: 3-4 sentences describing a specific segment of the target audience, their pain points, desires, demographic details, and why this content will strongly resonate with them)
      - cta (call to action, 10-15 words that clearly direct the audience on what specific action to take next)
      - principle (one persuasion principle)
      - principleExplanation (1 short sentence only)
      - visual (5-10 words detailed description of visual concept)
      - proposedCaption (75-100 words with hashtags at the end)
      
      ${aesthetic ? `Make sure all posts align with the specified aesthetic/style: "${aesthetic}". The visual concepts and caption tone should reflect this aesthetic.` : ''}
      
      Make each post highly specific and actionable with a clear purpose aligned with the objectives.
      
      RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT WITHOUT ANY EXPLANATION OR MARKDOWN:
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
      
      // Try direct parsing first with error handling
      try {
        // Basic cleanup: remove any markdown formatting and leading/trailing whitespace
        const cleanedText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^\s+|\s+$/g, '');
          
        jsonData = JSON.parse(cleanedText);
        console.log(`Week ${weekNumber} JSON parsed successfully`);
      } catch (parseError) {
        console.error(`Error parsing Week ${weekNumber} JSON:`, parseError.message);
        
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
      
      // Verify we have the right structure and posts array
      if (!jsonData.posts || !Array.isArray(jsonData.posts)) {
        throw new Error("Response missing 'posts' array property");
      }
      
      // Ensure we have exactly 3 posts
      if (jsonData.posts.length !== 3) {
        console.warn(`Invalid posts count (${jsonData.posts.length}), adjusting structure...`);
        
        // If we have too few posts, add defaults
        while (jsonData.posts.length < 3) {
          jsonData.posts.push({
            type: ["Carousel", "Video", "Reel"][jsonData.posts.length % 3],
            topic: `${weekTheme} comprehensive guide to transform your fitness routine with expert insights`,
            audience: `${strategy.target_audience[jsonData.posts.length % strategy.target_audience.length]} who struggle with consistency and need structured guidance. They're motivated but overwhelmed by conflicting information, seeking proven methods that fit their lifestyle.`,
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
      
      // Add the week data to the response
      const weekContent = {
        week: weekNumber,
        theme: weekTheme,
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