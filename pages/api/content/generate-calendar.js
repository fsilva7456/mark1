import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { contentOutline, strategy, calendarParams, modelConfig } = req.body;
    
    if (!contentOutline || !strategy || !calendarParams) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        received: JSON.stringify({
          hasContentOutline: !!contentOutline,
          hasStrategy: !!strategy,
          hasCalendarParams: !!calendarParams
        })
      });
    }
    
    // Ensure we have posts
    const postCount = contentOutline.reduce((count, week) => count + (week.posts?.length || 0), 0);
    if (postCount === 0) {
      return res.status(400).json({ error: 'No content posts available to schedule' });
    }
    
    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    // Extract calendar parameters
    const { startDate, postFrequency, postDays, postTime, channels } = calendarParams;
    
    // Configure API with Gemini 2.0 Flash model
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Define model configuration explicitly for better control
    const modelName = modelConfig?.model || "gemini-2.0-flash";
    const generationConfig = {
      temperature: 0.2, // Lower temperature for more predictable results
      maxOutputTokens: 1000,
    };
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: generationConfig
    });
    
    console.log("Using model configuration:", {
      model: modelName,
      generationConfig: generationConfig,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    // Format content for calendar planning
    const formattedContent = contentOutline.map(week => ({
      week: week.week,
      theme: week.theme ? String(week.theme).replace(/"/g, '\\"') : "",
      objective: week.objective ? String(week.objective).replace(/"/g, '\\"') : "",
      targetSegment: week.targetSegment ? String(week.targetSegment).replace(/"/g, '\\"') : "",
      phase: week.phase ? String(week.phase).replace(/"/g, '\\"') : "",
      posts: (week.posts || []).map(post => ({
        type: post.type ? String(post.type).replace(/"/g, '\\"') : "",
        topic: post.topic ? String(post.topic).replace(/"/g, '\\"') : "",
        audience: post.audience ? String(post.audience).replace(/"/g, '\\"') : "",
        cta: post.cta ? String(post.cta).replace(/"/g, '\\"') : "",
        principle: post.principle ? String(post.principle).replace(/"/g, '\\"') : ""
      }))
    }));
    
    // Sanitize business and audience info
    const businessDesc = strategy.business_description ? 
      String(strategy.business_description).replace(/"/g, '\\"') : 
      'Fitness business focusing on personalized training and wellness.';
    
    const targetAudience = typeof strategy.target_audience === 'string' ? 
      strategy.target_audience.replace(/"/g, '\\"') : 
      (Array.isArray(strategy.target_audience) ? 
        strategy.target_audience.map(a => String(a).replace(/"/g, '\\"')).join(', ') : 
        'Fitness enthusiasts');
    
    // Create a prompt for calendar generation
    const prompt = `
      You are a social media marketing expert. Create a content calendar for a fitness business based on the provided content plan and scheduling preferences.
      
      BUSINESS OVERVIEW:
      ${businessDesc}
      
      TARGET AUDIENCE:
      ${targetAudience}
      
      CONTENT PLAN:
      ${JSON.stringify(formattedContent, null, 2)}
      
      CALENDAR SPECIFICATIONS:
      - Start Date: ${new Date(startDate).toISOString().split('T')[0]}
      - Selected Days: ${postDays.join(', ')}
      - Posting Time: ${postTime}
      - Selected Channels: ${channels.join(', ')}
      - Post Frequency: ${postFrequency}
      
      TASK:
      Create a content calendar that strategically schedules the provided content across the selected channels. 
      Distribute the content in a way that:
      1. Follows the specified posting days (${postDays.join(', ')})
      2. Creates a logical progression through the themes
      3. Varies content types appropriately across channels
      4. Ensures balanced distribution across channels
      5. Places content at the optimal time for each platform
      
      IMPORTANT:
      - Don't invent new content - use only the provided posts
      - Be strategic about which platform each post type is best suited for
      - For each post, assign a specific date, time, and platform
      - Ensure your response is valid JSON with properly escaped characters
      
      RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
      {
        "posts": [
          {
            "title": "Post title/topic",
            "content": "Brief content summary",
            "type": "Content type (Carousel, Video, etc.)",
            "audience": "Target audience",
            "scheduledDate": "ISO-formatted date with time (YYYY-MM-DDTHH:MM:SS.sssZ)",
            "channel": "Platform name (instagram, facebook, etc.)"
          }
          // ... more posts
        ]
      }
    `;
    
    console.log("Generating content calendar...");
    
    // Add retry logic for API calls
    const maxRetries = 3;
    let attempt = 0;
    let result;
    
    while (attempt < maxRetries) {
      try {
        console.log(`API attempt ${attempt + 1} of ${maxRetries}...`);
        
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        
        // If we get here, the call succeeded
        break;
      } catch (apiError) {
        attempt++;
        console.error(`API attempt ${attempt} failed:`, apiError.message);
        
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
    try {
      // Get the text response
      const text = response.text();
      console.log(`Calendar response preview:`, text.substring(0, 100) + "...");
      
      // Clean JSON response with more robust processing
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Handle potential escaping issues that could cause JSON parsing errors
      // Replace any unescaped quotes within strings that might break JSON parsing
      const fixEscapingRegex = /("(?:\\.|[^"\\])*)"([^":,\[\]{}])/g;
      cleanedText = cleanedText.replace(fixEscapingRegex, '$1\\"$2');
      
      // Try to extract JSON if surrounded by other text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      // Log the cleaned text for debugging
      console.log("Attempting to parse JSON:", cleanedText.substring(0, 100) + "...");
      
      // Add fallback parsing with a more lenient approach if standard parsing fails
      let jsonData;
      try {
        jsonData = JSON.parse(cleanedText);
      } catch (initialParseError) {
        console.error("Initial JSON parse failed:", initialParseError);
        
        // Try a more aggressive cleaning approach
        cleanedText = cleanedText
          // Remove all control characters
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          // Ensure property names are quoted
          .replace(/(\s*?)(\w+)(\s*?):/g, '"$2":')
          // Fix trailing commas in arrays/objects
          .replace(/,(\s*[\]}])/g, '$1');
        
        try {
          // Try again with the more aggressively cleaned text
          jsonData = JSON.parse(cleanedText);
          console.log("Fallback JSON parsing succeeded after aggressive cleaning");
        } catch (fallbackError) {
          console.error("Fallback JSON parsing also failed:", fallbackError);
          
          // As a last resort, try to use a safer but less efficient JSON5 approach
          // If that's not available, just throw and let the error handler deal with it
          throw new Error(`JSON parsing failed: ${fallbackError.message}. Position: ${fallbackError.position}`);
        }
      }
      
      // Validate the response format
      if (!jsonData.posts || !Array.isArray(jsonData.posts)) {
        throw new Error('Invalid response format: missing posts array');
      }
      
      // Validate and process each post
      const processedPosts = jsonData.posts.map(post => {
        // Ensure all required fields are present
        if (!post.title || !post.scheduledDate || !post.channel) {
          console.warn('Post missing required fields:', post);
        }
        
        // Ensure scheduledDate is properly formatted
        let scheduledDate = post.scheduledDate;
        if (!scheduledDate.includes('T')) {
          // If only date is provided, add the specified time
          const [hours, minutes] = postTime.split(':');
          const date = new Date(scheduledDate);
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          scheduledDate = date.toISOString();
        }
        
        return {
          ...post,
          scheduledDate
        };
      });
      
      // Sort posts by date
      const sortedPosts = processedPosts.sort((a, b) => 
        new Date(a.scheduledDate) - new Date(b.scheduledDate)
      );
      
      return res.status(200).json({ posts: sortedPosts });
    } catch (parseError) {
      console.error('Error processing calendar response:', parseError);
      
      // Return error instead of fallback content
      return res.status(500).json({ 
        error: 'Failed to parse calendar response: ' + parseError.message,
        details: "The API response could not be properly parsed as JSON."
      });
    }
  } catch (error) {
    console.error('Error generating calendar:', error);
    
    // Return error status and message
    return res.status(500).json({ 
      error: `Failed to generate content calendar: ${error.message}`,
      details: "Please try again later or check API key configuration."
    });
  }
} 