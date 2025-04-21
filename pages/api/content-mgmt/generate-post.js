import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@lib/supabase';
import logger from '@lib/logger';
// The crypto library usage was causing issues, so we'll implement a simpler UUID function
// import crypto from 'crypto';

const log = logger.createLogger('GeneratePost');

// Simple UUID generation function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
        v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { calendarId, userId, channel } = req.body;

    if (!calendarId || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: 'calendarId, userId',
        received: { calendarId, userId },
      });
    }

    log.info('Generating post', { calendarId, userId, channel });

    // Fetch the calendar data
    const { data: calendar, error: calendarError } = await supabase
      .from('calendars')
      .select('*')
      .eq('id', calendarId)
      .single();

    if (calendarError) {
      log.error('Error fetching calendar', { error: calendarError });
      return res.status(500).json({ error: `Failed to fetch calendar: ${calendarError.message}` });
    }

    // Fetch the strategy associated with this calendar
    const { data: strategies, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', calendar.strategy_id);

    if (strategyError) {
      log.error('Error fetching strategy', { error: strategyError });
      return res.status(500).json({ error: `Failed to fetch strategy: ${strategyError.message}` });
    }

    // Initialize strategy variable
    let strategy;

    // Handle case with no strategies or multiple strategies
    if (!strategies || strategies.length === 0) {
      log.warn('No strategy found for calendar, creating a new one', { calendar_id: calendarId, strategy_id: calendar.strategy_id });
      
      // Generate a new UUID for the strategy
      const newStrategyId = generateUUID();
      
      // Create a basic default strategy with a new ID
      const defaultStrategy = {
        id: newStrategyId, // Use a completely new ID
        user_id: userId,
        business_name: calendar.name || 'Fitness Business',
        business_description: 'A fitness business focusing on helping clients achieve their health and fitness goals',
        target_audience: ['Fitness enthusiasts', 'Health-conscious individuals'],
        key_messages: ['Achieve your fitness goals', 'Live a healthier lifestyle', 'Transform your body and mind'],
        objectives: ['Increase client engagement', 'Build brand awareness', 'Generate leads'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        // Insert the default strategy
        const { data: newStrategy, error: insertError } = await supabase
          .from('strategies')
          .insert([defaultStrategy])
          .select();
          
        if (insertError) {
          log.error('Error creating default strategy', { error: insertError });
          return res.status(500).json({ error: 'Failed to create default strategy: ' + insertError.message });
        }
        
        // Now update the calendar to point to this new strategy
        const { error: updateError } = await supabase
          .from('calendars')
          .update({ strategy_id: newStrategyId })
          .eq('id', calendarId);
          
        if (updateError) {
          log.error('Error updating calendar with new strategy ID', { error: updateError });
          // Continue anyway, we can still use the strategy even if we couldn't update the calendar
        } else {
          log.info('Updated calendar with new strategy ID', { calendar_id: calendarId, new_strategy_id: newStrategyId });
        }
        
        log.info('Created default strategy', { strategy_id: newStrategyId });
        strategy = newStrategy[0];
      } catch (error) {
        log.error('Error in default strategy creation', { error });
        return res.status(500).json({ error: 'Failed to create default strategy: ' + error.message });
      }
    } else {
      // Use the most recently updated strategy if there are multiple
      strategy = strategies.length > 1 
        ? strategies.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] 
        : strategies[0];
        
      log.info('Using strategy', { strategy_id: strategy.id, multiple_found: strategies.length > 1 });
    }

    // Fetch the content outline if it exists
    const { data: contentOutlines, error: contentOutlineError } = await supabase
      .from('content_outlines')
      .select('*')
      .eq('strategy_id', strategy.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const contentOutline = contentOutlines && contentOutlines.length > 0 ? contentOutlines[0] : null;

    if (contentOutlineError) {
      log.warn('Error fetching content outline', { error: contentOutlineError });
      // Continue without content outline - not critical
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      log.error('Missing Gemini API key');
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }

    // Configure API
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800,
      },
    });

    // Get today's date
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon for consistency

    // Prepare prompt based on available data
    const hasEnhancedData = strategy.enhancedStrategy && strategy.enhancedStrategy.audiences;
    let targetSegment = '';
    let weekTheme = 'Fitness improvement and wellness';

    // Extract theme from content outline if available
    if (contentOutline && contentOutline.outline) {
      try {
        const outline = typeof contentOutline.outline === 'string' 
          ? JSON.parse(contentOutline.outline) 
          : contentOutline.outline;
        
        if (outline.weeks && outline.weeks.length > 0) {
          // Find current week based on today's date relative to outline creation
          const outlineCreated = new Date(contentOutline.created_at);
          const daysSinceCreation = Math.floor((today - outlineCreated) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.min(Math.floor(daysSinceCreation / 7), outline.weeks.length - 1);
          
          weekTheme = outline.weeks[weekIndex].theme || weekTheme;
          targetSegment = outline.weeks[weekIndex].targetSegment || '';
        }
      } catch (error) {
        log.error('Error parsing content outline', { error });
        // Continue with default theme
      }
    }

    // Create the prompt based on available data
    let prompt;
    if (hasEnhancedData && targetSegment) {
      // Find the audience segment data that matches the target segment
      const targetAudienceData = strategy.enhancedStrategy.audiences.find(
        a => a.segment.includes(targetSegment) || targetSegment.includes(a.segment)
      );

      if (targetAudienceData) {
        prompt = `
          You are a fitness content marketing expert. Create one highly engaging social media post specific to the audience segment and theme below.
          
          BUSINESS: "${strategy.business_description || 'Fitness business'}"
          
          TARGET AUDIENCE SEGMENT:
          ${targetAudienceData.segment}
          
          AUDIENCE-SPECIFIC OBJECTIVES:
          ${targetAudienceData.objectives
            .map((obj, i) => `${i + 1}. "${obj.objective}" - Success metric: ${obj.successMetrics}`)
            .join('\n')}
          
          AUDIENCE-SPECIFIC KEY MESSAGES:
          ${targetAudienceData.keyMessages.map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}
          
          PRIMARY CHANNELS:
          ${targetAudienceData.channels.join(', ')}
          
          RECOMMENDED CONTENT TYPES:
          ${targetAudienceData.objectives.flatMap(obj => obj.contentTypes).join(', ')}
          
          WEEK THEME: "${weekTheme}"
          TARGET CHANNEL: "${channel || targetAudienceData.channels[0]}"
          
          CREATE 1 DETAILED CONTENT POST:
          Include:
          1. Content type (Choose from the recommended content types for this audience and appropriate for the specified channel)
          2. Specific topic and angle that aligns with the theme
          3. Detailed target audience description (be specific about this segment's pain points and goals)
          4. Clear call-to-action (CTA)
          5. Persuasion principle used (e.g., Social Proof, Scarcity, Authority, Reciprocity, Liking, Commitment/Consistency)
          6. Brief explanation of why this principle works for this specific audience
          7. Visual concept (describe what the post should look like)
          8. Proposed caption (include emojis and hashtags where appropriate)
          
          RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT WITHOUT ANY EXPLANATION OR MARKDOWN:
          {
            "post": {
              "title": "Brief title describing the post",
              "type": "Content type",
              "channel": "${channel || targetAudienceData.channels[0]}",
              "topic": "Specific topic with angle",
              "audience": "Detailed target audience description",
              "content": "Full content of the post",
              "cta": "Clear call-to-action",
              "principle": "Persuasion principle used",
              "principleExplanation": "Brief explanation of why this principle works",
              "visual": "Visual concept description",
              "hashtags": ["hashtag1", "hashtag2", "etc"]
            }
          }
        `;
      } else {
        // Generic prompt with enhanced data
        prompt = createGenericPrompt(strategy, weekTheme, channel);
      }
    } else {
      // Basic prompt
      prompt = createGenericPrompt(strategy, weekTheme, channel);
    }

    log.info('Generating content with Gemini API');
    
    // Call the Gemini API with retry logic
    const maxRetries = 3;
    let attempt = 0;
    let result;

    while (attempt < maxRetries) {
      try {
        log.debug(`API attempt ${attempt + 1} of ${maxRetries}`);
        
        result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        // If we get here, the call succeeded
        break;
      } catch (apiError) {
        attempt++;
        log.error(`API attempt ${attempt} failed`, { error: apiError.message });
        
        if (attempt >= maxRetries) {
          log.error('All API retry attempts failed');
          throw new Error(`Gemini API error: ${apiError.message}`);
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        log.debug(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const response = result.response;
    
    // Process the response to extract clean JSON
    let jsonData;
    try {
      // Get the text response
      const text = response.text();
      log.debug('API response preview', { preview: text.substring(0, 100) + '...' });
      
      // Clean the JSON
      let cleanedText = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*\]/g, ']')
        .replace(/(['"])\s*:\s*/g, '$1:');
      
      // Parse the JSON data
      jsonData = JSON.parse(cleanedText);
      
      // Ensure we have the right post structure
      if (!jsonData.post) {
        // Try to extract the post from a different structure
        if (jsonData.posts && jsonData.posts.length > 0) {
          jsonData.post = jsonData.posts[0];
        } else {
          throw new Error('Missing post data in API response');
        }
      }
      
      // Prepare the post data for Supabase
      const postData = {
        calendar_id: calendarId,
        user_id: userId,
        title: jsonData.post.title || `${weekTheme} Post`,
        content: jsonData.post.content || '',
        post_type: jsonData.post.type || 'Image',
        target_audience: jsonData.post.audience || '',
        scheduled_date: today.toISOString(),
        channel: jsonData.post.channel || channel || 'Instagram',
        status: 'scheduled',
        engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
      };
      
      // Save to Supabase
      const { data: insertedPost, error: insertError } = await supabase
        .from('calendar_posts')
        .insert([postData])
        .select();
      
      if (insertError) {
        log.error('Error inserting post into Supabase', { error: insertError });
        return res.status(500).json({ error: `Failed to save generated post: ${insertError.message}` });
      }
      
      // Update calendar metadata
      try {
        // Get current post count
        const { data: countData } = await supabase
          .from('calendar_posts')
          .select('id', { count: 'exact' })
          .eq('calendar_id', calendarId);
        
        const postCount = countData ? countData.length : 1;
        
        // Update calendar
        await supabase
          .from('calendars')
          .update({ 
            posts_scheduled: postCount,
            status: 'active',
            modified_at: new Date().toISOString()
          })
          .eq('id', calendarId);
        
        log.info(`Updated calendar ${calendarId} with new post count`);
      } catch (updateError) {
        log.error(`Failed to update calendar metadata`, { error: updateError });
        // Non-critical error, continue
      }
      
      // Return the created post
      return res.status(200).json({ 
        success: true,
        post: insertedPost[0]
      });
      
    } catch (parseError) {
      log.error('Error processing API response', { error: parseError });
      return res.status(500).json({
        error: `Failed to parse API response: ${parseError.message}`,
        details: 'The API response could not be properly processed.'
      });
    }
  } catch (error) {
    log.error('Error generating post', { error });
    return res.status(500).json({
      error: `Failed to generate post: ${error.message}`,
      details: 'Please try again later or check API key configuration.'
    });
  }
}

// Helper function to create a generic prompt
function createGenericPrompt(strategy, weekTheme, channel) {
  return `
    You are a fitness content marketing expert. Create one highly engaging social media post based on the strategy and theme below.
    
    BUSINESS: "${strategy.business_description || 'Fitness business'}"
    
    TARGET AUDIENCE: "${
      Array.isArray(strategy.target_audience) 
        ? strategy.target_audience.join(', ') 
        : strategy.target_audience || 'Fitness enthusiasts'
    }"
    
    KEY MESSAGES: ${
      Array.isArray(strategy.key_messages) 
        ? strategy.key_messages.join(', ') 
        : strategy.key_messages || 'Health and fitness transformation'
    }
    
    WEEK THEME: "${weekTheme}"
    TARGET CHANNEL: "${channel || 'Instagram'}"
    
    CREATE 1 DETAILED CONTENT POST:
    Include:
    1. Content type (Carousel, Video, Reel, Transformation Post, etc. - appropriate for the channel)
    2. Specific topic and angle that aligns with the theme
    3. Target audience description - be specific and detailed about who this post is for
    4. Full content of the post
    5. Clear call-to-action (CTA)
    6. Persuasion principle used (e.g., Social Proof, Scarcity, Authority)
    7. Brief explanation of why this principle works here
    8. Visual concept (describe what the post should look like)
    9. Hashtags to use (5-10 relevant hashtags)
    
    RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT WITHOUT ANY EXPLANATION OR MARKDOWN:
    {
      "post": {
        "title": "Brief title describing the post",
        "type": "Content type",
        "channel": "${channel || 'Instagram'}",
        "topic": "Specific topic with angle",
        "audience": "Detailed target audience description",
        "content": "Full content of the post",
        "cta": "Clear call-to-action",
        "principle": "Persuasion principle used",
        "principleExplanation": "Brief explanation of why this principle works",
        "visual": "Visual concept description",
        "hashtags": ["hashtag1", "hashtag2", "etc"]
      }
    }
  `;
}