import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { strategy, weekNumber, weekTheme, allThemes } = req.body;
    
    if (!strategy || !weekNumber || !weekTheme) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        received: JSON.stringify({ strategy: !!strategy, weekNumber, weekTheme, allThemes: !!allThemes })
      });
    }
    
    // Check weekNumber is valid
    if (weekNumber < 1 || weekNumber > 3) {
      return res.status(400).json({ error: 'Week number must be between 1 and 3' });
    }
    
    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the more stable model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800,
        responseFormat: { type: "json" },
      }
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
      
      ${allThemes ? `CONTENT PLAN CONTEXT:
      Week 1: "${allThemes[0].theme}"
      Week 2: "${allThemes[1].theme}"
      Week 3: "${allThemes[2].theme}"
      ` : ''}
      
      Each post must have:
      - type (choose from: Carousel, Video, Reel, Story, Image)
      - topic (brief description)
      - audience (use exact text from target audience list)
      - cta (call to action, under 10 words)
      - principle (one persuasion principle)
      - principleExplanation (1 short sentence only)
      - visual (2-3 words description)
      - proposedCaption (50-75 words maximum)
      
      RETURN ONLY THIS JSON FORMAT:
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
        console.log("Model being used:", "gemini-1.5-flash");
        console.log("Week data:", JSON.stringify({
          weekNumber,
          weekTheme,
          has_allThemes: !!allThemes,
          has_business_desc: !!strategy.business_description,
          target_audience_count: strategy.target_audience?.length || 0
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
            topic: `${weekTheme} content ${jsonData.posts.length + 1}`,
            audience: strategy.target_audience[jsonData.posts.length % strategy.target_audience.length],
            cta: "Contact us for more information",
            principle: "Social Proof",
            principleExplanation: "People tend to follow what others are doing.",
            visual: "Fitness demonstration",
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
      
      // Create fallback content for this week
      const fallbackWeekContent = {
        week: weekNumber,
        theme: weekTheme,
        posts: [
          { 
            type: "Carousel", 
            topic: `${weekTheme} introduction`, 
            audience: strategy.target_audience[0] || "Fitness enthusiasts",
            cta: "Save this post for reference",
            principle: "Authority",
            principleExplanation: "Expert information establishes credibility.",
            visual: "Infographic carousel",
            proposedCaption: `Learn more about ${weekTheme} in this helpful guide. Save this post to reference later! #Fitness #HealthTips`
          },
          { 
            type: "Video", 
            topic: `${weekTheme} demonstration`, 
            audience: strategy.target_audience[1] || "Active adults",
            cta: "Try this in your next workout",
            principle: "Social Proof",
            principleExplanation: "Showing others succeeding motivates viewers.",
            visual: "Demonstration video",
            proposedCaption: `Watch how to properly execute this ${weekTheme} technique. Let me know if you try it in your next workout! #FitnessTips #WorkoutWednesday`
          },
          { 
            type: "Image", 
            topic: `${weekTheme} success story`, 
            audience: strategy.target_audience[2] || "Beginners",
            cta: "Comment with your questions",
            principle: "Reciprocity",
            principleExplanation: "Sharing valuable information creates goodwill.",
            visual: "Before/after comparison",
            proposedCaption: `Real results from our ${weekTheme} approach. Have questions? Drop them in the comments below and I'll answer! #FitnessJourney #Results`
          }
        ]
      };
      
      console.log(`Using fallback content for Week ${weekNumber} due to parsing error`);
      return res.status(200).json({ weekContent: fallbackWeekContent });
    }
  } catch (error) {
    console.error('Error generating week content:', error);
    
    // Create generic fallback response
    const fallbackResponse = {
      weekContent: {
        week: req.body.weekNumber || 1,
        theme: req.body.weekTheme || "Fitness Content",
        posts: [
          { 
            type: "Carousel", 
            topic: "Fitness tips collection", 
            audience: "Fitness enthusiasts",
            cta: "Save for later",
            principle: "Authority",
            principleExplanation: "Expert information builds trust and credibility.",
            visual: "Tip graphics",
            proposedCaption: "Essential fitness tips to improve your workout routine. Save this post for your next gym session! #FitnessTips #WorkoutAdvice"
          },
          { 
            type: "Video", 
            topic: "Workout demonstration", 
            audience: "Active adults",
            cta: "Try this exercise",
            principle: "Social Proof",
            principleExplanation: "Showing successful examples motivates others.",
            visual: "Exercise demo",
            proposedCaption: "Check out this effective exercise that's perfect for busy schedules. Let me know if you try it! #QuickWorkout #FitnessDemo"
          },
          { 
            type: "Image", 
            topic: "Motivational content", 
            audience: "Beginners",
            cta: "Share your journey",
            principle: "Consistency",
            principleExplanation: "Small consistent efforts lead to big results.",
            visual: "Motivational quote",
            proposedCaption: "Remember: consistency beats perfection every time. Share your fitness journey in the comments! #FitnessMotivation #ConsistencyWins"
          }
        ]
      }
    };
    
    return res.status(200).json(fallbackResponse);
  }
} 