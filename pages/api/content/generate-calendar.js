import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../../lib/supabase'; // Import Supabase client

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { contentOutline, strategy, calendarParams, modelConfig, calendarId, userId } = req.body;
    
    // Log request details for debugging
    console.log("Calendar generation request:", {
      contentOutlineLength: contentOutline?.length || 0,
      strategyId: strategy?.id || 'none',
      calendarParamsProvided: !!calendarParams,
      requestHeaders: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
      },
      calendarId,
      userIdProvided: !!userId
    });
    
    if (!contentOutline || !strategy || !calendarParams || !calendarId || !userId) {
      console.error("Missing required parameters:", {
        hasContentOutline: !!contentOutline,
        hasStrategy: !!strategy,
        hasCalendarParams: !!calendarParams,
        hasCalendarId: !!calendarId,
        hasUserId: !!userId
      });
      
      return res.status(400).json({ 
        error: 'Missing required parameters',
        received: JSON.stringify({
          hasContentOutline: !!contentOutline,
          hasStrategy: !!strategy,
          hasCalendarParams: !!calendarParams,
          hasCalendarId: !!calendarId,
          hasUserId: !!userId
        })
      });
    }
    
    // Ensure we have posts
    const postCount = contentOutline.reduce((count, week) => count + (week.posts?.length || 0), 0);
    
    console.log(`Found ${postCount} posts in content outline`);
    
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
    
    console.log("Calendar parameters:", {
      startDate,
      postFrequency,
      postDays: postDays.join(', '),
      postTime,
      channels: channels.join(', ')
    });
    
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
        console.log("Successfully generated content from Gemini API");
        break;
      } catch (apiError) {
        attempt++;
        console.error(`API attempt ${attempt} failed:`, apiError.message);
        console.error(`API error details:`, apiError);
        
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
          
          // Last resort: Create a calendar manually from the content outline
          console.log("Creating manual calendar from content outline...");
          const posts = [];
          const startDateObj = new Date(startDate);
          
          // Ensure we're using the correct time format
          let hours = 9; // Default to 9 AM if not specified
          let minutes = 0;
          
          if (postTime) {
            const timeParts = postTime.split(':');
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
          }
          
          console.log(`Using posting time: ${hours}:${minutes}`);
          console.log(`Posting days: ${postDays.join(', ')}`);
          
          // Map day names to day numbers (0-6, Sunday is 0)
          const dayMap = {
            'Sunday': 0, 
            'Monday': 1, 
            'Tuesday': 2, 
            'Wednesday': 3, 
            'Thursday': 4, 
            'Friday': 5, 
            'Saturday': 6
          };
          
          // Convert posting days to numbers
          const postDayNumbers = postDays.map(day => dayMap[day]);
          
          // Get all posts from all weeks
          const allPosts = [];
          contentOutline.forEach(week => {
            if (week.posts && Array.isArray(week.posts)) {
              week.posts.forEach(post => {
                allPosts.push({
                  ...post,
                  week: week.week
                });
              });
            }
          });
          
          console.log(`Total posts from content outline: ${allPosts.length}`);
          
          // Calculate the starting date and ensure it falls on a valid posting day
          let currentDate = new Date(startDateObj);
          
          // If the start date is not a valid posting day, move to the next valid day
          while (!postDayNumbers.includes(currentDate.getDay())) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Set the time
          currentDate.setHours(hours, minutes, 0, 0);
          
          // Create a constant to track alternating platforms (assuming 2 platforms)
          let platformIndex = 0;
          
          // Distribute posts across valid posting days
          for (let i = 0; i < allPosts.length; i++) {
            const post = allPosts[i];
            
            // Create the post object
            posts.push({
              title: post.topic || `Week ${post.week} Post ${i + 1}`,
              content: post.topic || "Generated content",
              type: post.type || "Post",
              audience: post.audience || "Target audience",
              scheduledDate: new Date(currentDate).toISOString(),
              channel: channels[platformIndex % channels.length]
            });
            
            // Alternate platforms
            platformIndex++;
            
            // If we've used all platforms for this day, move to the next posting day
            if (platformIndex % channels.length === 0) {
              // Find the next valid posting day
              do {
                currentDate.setDate(currentDate.getDate() + 1);
              } while (!postDayNumbers.includes(currentDate.getDay()));
              
              // Reset the time for the new day
              currentDate.setHours(hours, minutes, 0, 0);
            }
          }
          
          jsonData = { posts };
          console.log(`Created ${posts.length} posts manually, respecting posting days and times`);
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
      
      // --- SAVE POSTS TO SUPABASE --- 
      if (jsonData.posts && jsonData.posts.length > 0) {
          console.log(`Attempting to save ${jsonData.posts.length} posts to Supabase...`);
          
          const postsToInsert = jsonData.posts.map(post => ({
              calendar_id: calendarId, // Add calendar ID
              user_id: userId, // Add user ID
              title: post.title || 'Untitled Post', 
              content: post.content || '', // Ensure content exists
              post_type: post.type || 'Text', // Map type to post_type
              target_audience: post.audience || '', // Map audience
              scheduled_date: post.scheduledDate, // Use the generated date
              channel: post.channel || channels[0], // Use generated channel or default
              status: 'scheduled', // Default status for generated posts
              engagement: { likes: 0, comments: 0, shares: 0, reach: 0 } // Default engagement
          }));
          
          // Insert posts into calendar_posts table
          const { data: insertedPosts, error: insertError } = await supabase
              .from('calendar_posts')
              .insert(postsToInsert)
              .select(); // Select to confirm insertion
              
          if (insertError) {
              console.error('Error inserting posts into Supabase:', insertError);
              // Decide if we should still return success or throw an error
              // For now, log the error and continue, but maybe return error to user
              // throw new Error(`Failed to save generated posts: ${insertError.message}`);
              console.warn("Failed to save posts to database, but returning success as generation completed.");
          } else {
              console.log(`Successfully saved ${insertedPosts?.length || 0} posts to calendar_posts table.`);
              
              // Optionally: Update the main calendar record with post count
              try {
                 await supabase
                     .from('calendars')
                     .update({ posts_scheduled: insertedPosts?.length || 0, status: 'active' })
                     .eq('id', calendarId);
                 console.log(`Updated calendar ${calendarId} with post count.`);
              } catch (updateError) {
                 console.error(`Failed to update calendar ${calendarId} metadata:`, updateError);
              }
          }
      } else {
          console.log("No valid posts generated or parsed, skipping database insert.");
      }
      // --- END SAVE POSTS --- 
      
      // Return success message instead of posts array
      return res.status(200).json({ 
          message: `Calendar generated successfully. ${jsonData.posts?.length || 0} posts created.`,
          note: jsonData.note // Include note if fallback was used
      });
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
  console.log("Creating fallback calendar with parameters:", {
    startDate: startDateStr,
    postTime,
    postDays: postDays.join(', '),
    channels: channels.join(', ')
  });
  
  // Parse the start date
  const startDate = new Date(startDateStr);
  
  // Parse time
  let hours = 9, minutes = 0;
  if (postTime) {
    const timeParts = postTime.split(':');
    hours = parseInt(timeParts[0], 10);
    minutes = parseInt(timeParts[1], 10);
  }
  
  // Map day names to day numbers (0-6, Sunday is 0)
  const dayMap = {
    'Sunday': 0, 
    'Monday': 1, 
    'Tuesday': 2, 
    'Wednesday': 3, 
    'Thursday': 4, 
    'Friday': 5, 
    'Saturday': 6
  };
  
  // Convert posting days to numbers
  const postDayNumbers = postDays.map(day => dayMap[day]);
  console.log("Post day numbers:", postDayNumbers);
  
  // Get all posts from all weeks
  const allPosts = [];
  contentOutline.forEach(week => {
    if (week.posts && Array.isArray(week.posts)) {
      week.posts.forEach(post => {
        allPosts.push({
          ...post,
          week: week.week
        });
      });
    }
  });
  
  console.log(`Total posts from content outline: ${allPosts.length}`);
  
  // Calculate the starting date and ensure it falls on a valid posting day
  let currentDate = new Date(startDate);
  
  // If the start date is not a valid posting day, move to the next valid day
  while (!postDayNumbers.includes(currentDate.getDay())) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Set the time
  currentDate.setHours(hours, minutes, 0, 0);
  
  // Create a constant to track alternating platforms
  let platformIndex = 0;
  
  // Distribute posts across valid posting days
  const posts = [];
  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    
    // Create the post object
    posts.push({
      title: post.topic || `Week ${post.week} Post ${i + 1}`,
      content: post.topic || "Generated content",
      type: post.type || "Post",
      audience: post.audience || "Target audience",
      scheduledDate: new Date(currentDate).toISOString(),
      channel: channels[platformIndex % channels.length]
    });
    
    // Alternate platforms
    platformIndex++;
    
    // If we've used all platforms for this day, move to the next posting day
    if (platformIndex % channels.length === 0) {
      // Find the next valid posting day
      do {
        currentDate.setDate(currentDate.getDate() + 1);
      } while (!postDayNumbers.includes(currentDate.getDay()));
      
      // Reset the time for the new day
      currentDate.setHours(hours, minutes, 0, 0);
    }
  }
  
  console.log(`Created ${posts.length} posts in fallback calendar`);
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