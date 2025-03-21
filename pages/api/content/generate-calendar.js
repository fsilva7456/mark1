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
      
      IMPORTANT FORMATTING INSTRUCTIONS:
      - ONLY respond with a valid JSON object and NOTHING else
      - DO NOT include markdown code blocks or any explanatory text
      - DO NOT add comments within the JSON
      - Make sure ALL strings are properly escaped
      - ALL property names must be in double quotes
      
      The JSON structure must have a posts array with objects containing: title, content, type, audience, scheduledDate, and channel properties.
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
      
      // Log the entire response for debugging
      console.log("Raw calendar API response:", text);
      
      // Clean JSON response with more robust processing
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Handle potential JSON structure issues - look for the actual JSON object
      const jsonMatch = cleanedText.match(/\{\s*"posts"\s*:\s*\[.+\]\s*\}/s);
      if (jsonMatch) {
        console.log("Found JSON object using regex match");
        cleanedText = jsonMatch[0];
      }
      
      // Strip any invalid characters before the opening brace
      const openBraceIndex = cleanedText.indexOf('{');
      if (openBraceIndex > 0) {
        console.log(`Removing ${openBraceIndex} characters before opening brace`);
        cleanedText = cleanedText.substring(openBraceIndex);
      }
      
      // Log the cleaned text for debugging
      console.log("Cleaned text (first 100 chars):", cleanedText.substring(0, 100));
      
      // Add fallback parsing with multiple approaches
      let jsonData;
      try {
        jsonData = JSON.parse(cleanedText);
      } catch (initialParseError) {
        console.error("Initial JSON parse failed:", initialParseError);
        
        // Try to diagnose the specific issue
        const errorPosition = initialParseError.message.match(/position (\d+)/);
        const position = errorPosition ? parseInt(errorPosition[1]) : -1;
        
        if (position >= 0) {
          const problemSection = cleanedText.substring(
            Math.max(0, position - 20),
            Math.min(cleanedText.length, position + 20)
          );
          console.error(`Problem area near position ${position}: "${problemSection}"`);
        }
        
        // Try a more aggressive cleaning approach
        const aggressiveCleaning = cleanedText
          // Remove all control characters and non-ASCII characters
          .replace(/[\u0000-\u001F\u007F-\u009F\u00A0-\uFFFF]/g, '')
          // Ensure property names are quoted
          .replace(/(\s*?)(\w+)(\s*?):/g, '"$2":')
          // Fix trailing commas in arrays/objects
          .replace(/,(\s*[\]}])/g, '$1')
          // Replace single quotes with double quotes
          .replace(/'/g, '"')
          // Fix any broken escaped quotes
          .replace(/\\*"/g, '\\"').replace(/\\+"/g, '\\"')
          // Escape any dangling quotes
          .replace(/([^\\])"/g, '$1\\"');
        
        try {
          // Try with the aggressive cleaning
          console.log("Attempting aggressive cleaning...");
          jsonData = JSON.parse(aggressiveCleaning);
          console.log("Aggressive cleaning succeeded");
        } catch (fallbackError) {
          console.error("Aggressive cleaning failed:", fallbackError);
          
          // Last resort: Try to construct a valid posts array manually
          try {
            console.log("Attempting manual JSON construction...");
            // Look for post objects in the response
            const postPattern = /"title"\s*:\s*"([^"]+)"[^}]+"type"\s*:\s*"([^"]+)"[^}]+"channel"\s*:\s*"([^"]+)"/g;
            const posts = [];
            let match;
            
            while ((match = postPattern.exec(cleanedText)) !== null) {
              posts.push({
                title: match[1],
                content: "Generated content",
                type: match[2],
                audience: "Target audience",
                scheduledDate: new Date().toISOString().split('T')[0],
                channel: match[3]
              });
            }
            
            if (posts.length > 0) {
              console.log(`Manually extracted ${posts.length} posts`);
              jsonData = { posts };
            } else {
              throw new Error("Could not extract any valid post data");
            }
          } catch (lastResortError) {
            console.error("All parsing attempts failed");
            throw new Error(`JSON parsing failed after multiple attempts: ${initialParseError.message}. See server logs for details.`);
          }
        }
      }
      
      // Validate the response format
      if (!jsonData.posts || !Array.isArray(jsonData.posts)) {
        console.warn('Invalid response format: missing posts array, attempting fallback response construction');
        
        // Create a fallback calendar structure from the content outline
        jsonData = createFallbackCalendar(contentOutline, startDate, postTime, postDays, channels);
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
      
      try {
        // Ultimate fallback: Create a minimal calendar structure from content outline
        const fallbackCalendar = createFallbackCalendar(contentOutline, startDate, postTime, postDays, channels);
        console.log('Using emergency fallback calendar structure');
        return res.status(200).json({ 
          posts: fallbackCalendar.posts,
          note: "This is a simplified fallback calendar due to API response issues. You may want to manually adjust the schedule."
        });
      } catch (fallbackError) {
        console.error('Even fallback calendar creation failed:', fallbackError);
        // Return error instead of fallback content
        return res.status(500).json({ 
          error: 'Failed to parse calendar response: ' + parseError.message,
          details: "The API response could not be properly parsed as JSON."
        });
      }
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

// Helper function to create a fallback calendar from content outline
function createFallbackCalendar(contentOutline, startDateStr, postTime, postDays, channels) {
  // Parse the start date
  const startDate = new Date(startDateStr);
  const [hours, minutes] = postTime.split(':');
  
  // Organize channels by days to distribute evenly
  const posts = [];
  let currentDate = new Date(startDate);
  let channelIndex = 0;
  
  // Process each week's posts
  contentOutline.forEach((week, weekIndex) => {
    if (!week.posts || !Array.isArray(week.posts)) return;
    
    week.posts.forEach((post, postIndex) => {
      // Find next valid posting day
      while (!postDays.includes(getDayName(currentDate))) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Create the post
      posts.push({
        title: post.topic || `Week ${week.week} Post ${postIndex + 1}`,
        content: post.topic || "Generated content",
        type: post.type || "Post",
        audience: post.audience || "Target audience",
        scheduledDate: getFormattedDate(currentDate, hours, minutes),
        channel: channels[channelIndex % channels.length]
      });
      
      // Rotate channels and move to next day
      channelIndex++;
      currentDate.setDate(currentDate.getDate() + 1);
    });
  });
  
  return { posts };
}

// Helper function to get day name
function getDayName(date) {
  return date.toLocaleString('en-US', { weekday: 'long' });
}

// Helper function to format date with time
function getFormattedDate(date, hours, minutes) {
  const newDate = new Date(date);
  newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return newDate.toISOString();
} 