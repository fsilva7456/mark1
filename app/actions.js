'use server';

export async function processWithGemini(text) {
  // Your API key should be stored in an environment variable
  // Make sure to create a .env.local file with GOOGLE_GEMINI_API_KEY=your_api_key
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: text
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Convert line breaks to <br> tags for HTML display
    return textContent.replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

export async function getDefaultSuggestions(businessInfo) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      You are a social media expert for fitness professionals. Based on the business description provided, suggest:
      
      1. The top 3 business objectives they should focus on
      2. The top 3 target audience segments they should aim for
      3. The top 3 content topics that would resonate most

      Business description: ${businessInfo}
      
      Provide your answer in JSON format with the keys: "objectives", "targetAudience", and "areasOfFocus".
      Each field should contain exactly 3 items separated by commas. 
      Be specific and concise, with each suggestion being one short sentence.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON part from the response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure all values are strings
      return {
        objectives: typeof parsed.objectives === 'string' ? parsed.objectives : 
                   (Array.isArray(parsed.objectives) ? parsed.objectives.join(", ") : JSON.stringify(parsed.objectives)),
        targetAudience: typeof parsed.targetAudience === 'string' ? parsed.targetAudience : 
                       (Array.isArray(parsed.targetAudience) ? parsed.targetAudience.join(", ") : JSON.stringify(parsed.targetAudience)),
        areasOfFocus: typeof parsed.areasOfFocus === 'string' ? parsed.areasOfFocus : 
                     (Array.isArray(parsed.areasOfFocus) ? parsed.areasOfFocus.join(", ") : JSON.stringify(parsed.areasOfFocus))
      };
    } catch (parseError) {
      console.error('Error parsing JSON from response:', parseError);
      // Return default values if parsing fails
      return {
        objectives: "1. Grow your client base, 2. Increase social media engagement, 3. Establish yourself as an authority",
        targetAudience: "1. Fitness beginners, 2. Working professionals, 3. Health-conscious individuals",
        areasOfFocus: "1. Workout tutorials, 2. Success stories, 3. Nutrition tips"
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

export async function generateSocialMediaStrategy(formData) {
  const { businessInfo, objectives, targetAudience, areasOfFocus } = formData;
  
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      You are a social media manager specializing in fitness content. Create a comprehensive social media strategy for the next month based on the following information:
      
      BUSINESS DESCRIPTION: ${businessInfo}
      OBJECTIVES: ${objectives}
      TARGET AUDIENCE: ${targetAudience}
      CONTENT TOPICS: ${areasOfFocus}
      
      Your response should include:
      
      1. A content calendar with specific post ideas for each week
      2. Suggested hashtags to use
      3. Best times to post
      4. Types of content (photos, videos, stories, reels, etc.)
      5. Ideas for engagement and audience growth
      6. Key metrics to track
      
      Format your response with clear headings, bullet points, and make it practical for immediate implementation.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Convert line breaks to <br> tags and maintain formatting
    return textContent.replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Generate a strategy matrix with target audiences, objectives, and key messages
export async function generateStrategyMatrix(businessInfo, feedback) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      You are a social media strategist for fitness professionals. Create a strategy matrix based on the following business description:
      
      BUSINESS DESCRIPTION: ${businessInfo}
      ${feedback ? `USER FEEDBACK: ${feedback}` : ''}
      
      Generate a strategy matrix with EXACTLY 3 target audience segments. For each audience segment, provide:
      1. A clearly defined target audience
      2. One key business objective for that audience
      3. A compelling key message that resonates with that audience and supports the objective
      
      Format your response as a JSON array of arrays, where each inner array has 3 elements:
      [
        ["Audience 1", "Objective 1", "Key Message 1"],
        ["Audience 2", "Objective 2", "Key Message 2"],
        ["Audience 3", "Objective 3", "Key Message 3"]
      ]
      
      DO NOT INCLUDE MORE THAN 3 AUDIENCE SEGMENTS.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1000
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON array from the response
    const jsonMatch = textContent.match(/\[\s*\[.*\]\s*\]/s);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON matrix from response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing JSON from response:', parseError);
      // Return a basic default matrix if parsing fails
      return [
        ["Fitness beginners", "Build confidence and establish basic routines", "Start your fitness journey with achievable steps designed for beginners"],
        ["Active professionals", "Optimize workout efficiency", "Maximize your limited time with high-impact workouts that fit your busy schedule"],
        ["Health-focused seniors", "Improve mobility and strength", "Age gracefully with safe, effective exercises that enhance quality of life"]
      ];
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Generate content outlines based on the strategy matrix
export async function generateContentOutlines(businessInfo, strategyMatrix) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      You are a social media content strategist for fitness businesses. Create content outlines based on this strategy matrix:
      
      BUSINESS DESCRIPTION: ${businessInfo}
      
      STRATEGY MATRIX:
      ${JSON.stringify(strategyMatrix, null, 2)}
      
      For EACH audience and objective pair, provide a content plan with:
      
      1. CONTENT STRATEGY:
         - Number of posts (recommend 3-5 posts)
         - Key messages across all posts
         - Posting schedule/timing
         - Why this sequence is strategic (build trust, educate, then convert)
      
      2. DETAILED POST PLANS:
         For each planned post, provide:
         - Key message for that specific post
         - Behavioral economics principle being used
         - Draft caption (Instagram-ready)
         - Suggested visual or video concept
      
      Structure your response as a valid JSON array of objects, where each object represents one audience's content plan:
      
      [
        {
          "audience": "Target Audience Name",
          "objective": "Their Key Objective",
          "postCount": 4,
          "keyMessages": "Brief overview of key messages throughout campaign",
          "timing": "Posting schedule recommendation",
          "sequenceRationale": "Why this sequence is strategic",
          "posts": [
            {
              "type": "Image Post or Video Post",
              "message": "Key message for this post",
              "behavioralPrinciples": "Principle(s) used in this post",
              "caption": "Draft Instagram caption",
              "visual": "Suggested visual description"
            },
            // additional posts...
          ]
        },
        // additional audiences...
      ]
      
      Return ONLY the JSON array - no introduction or explanation.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2500
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON array from the response
    const jsonMatch = textContent.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from content outlines response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing JSON content outlines:', parseError);
      
      // Fallback to basic format if parsing fails
      return strategyMatrix.map((row) => ({
        audience: row[0],
        objective: row[1],
        sequence: `1. Introduction post about ${row[0]}\n2. Educational content related to ${row[1]}\n3. Testimonial or success story\n4. Call to action for ${row[1]}`,
        captions: `1. "Are you a ${row[0]}? We understand your fitness needs..."\n2. "Learn how to achieve ${row[1]} with these tips..."\n3. "See how our clients like you have succeeded..."\n4. "Ready to ${row[1].toLowerCase()}? Here's how to get started..."`,
        visuals: `1. Photo showing ${row[0]} in action\n2. Informative graphic about ${row[1]}\n3. Before/after photos or testimonial quote\n4. Motivational image with clear CTA`
      }));
    }
  } catch (error) {
    console.error('Error generating content outlines:', error);
    throw error;
  }
}

// Generate a content calendar based on content outlines
export async function generateContentCalendar(businessInfo, contentOutlines, startDate) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      As a social media strategist, create a content calendar for the NEXT 5 WEEKS based on these content outlines.
      
      BUSINESS INFORMATION:
      ${businessInfo}
      
      CONTENT OUTLINES:
      ${JSON.stringify(contentOutlines, null, 2)}
      
      CALENDAR START DATE:
      ${startDate || 'Use today as the start date'}
      
      INSTRUCTIONS:
      1. Create a 5-week calendar starting from ${startDate || 'today'} that distributes posts strategically
      2. Consider optimal posting days (e.g., Monday, Wednesday, Friday) for engagement
      3. Avoid posting more than one item per day
      4. Posts from the same audience segment should be spaced out appropriately (7-10 days apart)
      5. Consider a logical sequence for each audience's content journey
      
      RESPONSE FORMAT:
      Return an HTML table representing a 5-week calendar, with each week as a row.
      Include the month and date in each cell, and for cells with posts, include the post title.
      
      Format example for a cell with a post:
      <td>May 1<div class="post audience1">Post 1: Introduction to fitness</div></td>
      
      Make sure each table cell has the same dimensions for consistency.
      
      IMPORTANT: Return ONLY the HTML table. No explanations or other text.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2000
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    let textContent = data.candidates[0].content.parts[0].text;
    
    // Extract just the HTML part - using a more flexible pattern
    let htmlContent = textContent;
    
    // Try several patterns to extract the HTML table
    const tablePattern = /<table[\s\S]*?<\/table>/;
    const htmlMatch = htmlContent.match(tablePattern);
    
    if (!htmlMatch) {
      // If no table found, create a basic table with the content
      console.log("Could not find HTML table in response, creating basic table");
      return createFiveWeekCalendar(contentOutlines, startDate);
    }
    
    // Add basic styling inline to the calendar
    let calendarHtml = htmlMatch[0];
    calendarHtml = calendarHtml.replace('<table', '<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;" ');
    calendarHtml = calendarHtml.replace(/<th/g, '<th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;" ');
    calendarHtml = calendarHtml.replace(/<td/g, '<td style="padding:10px;border:1px solid #ddd;height:120px;vertical-align:top;width:14.28%;position:relative;" ');
    
    // Style the audience posts
    calendarHtml = calendarHtml.replace(/<div class="post audience1"/g, '<div style="background:#4285f4;color:white;padding:5px;margin-top:5px;border-radius:4px;font-size:12px;" ');
    calendarHtml = calendarHtml.replace(/<div class="post audience2"/g, '<div style="background:#ea4335;color:white;padding:5px;margin-top:5px;border-radius:4px;font-size:12px;" ');
    calendarHtml = calendarHtml.replace(/<div class="post audience3"/g, '<div style="background:#fbbc05;color:white;padding:5px;margin-top:5px;border-radius:4px;font-size:12px;" ');
    
    return calendarHtml;
  } catch (error) {
    console.error('Error generating content calendar:', error);
    throw error;
  }
}

// Helper function to create a 5-week calendar
function createFiveWeekCalendar(contentOutlines, startDateStr) {
  // Parse the start date string or use current date if not provided
  let startDate;
  if (startDateStr) {
    startDate = new Date(startDateStr);
    // If invalid date, use today
    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }
  } else {
    startDate = new Date();
  }
  
  // Calculate the starting date (beginning of week containing the start date)
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek); // Go to Sunday
  
  // Create month names array
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  // Start building the calendar HTML
  let html = `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;">
    <tr>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Sunday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Monday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Tuesday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Wednesday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Thursday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Friday</th>
      <th style="background:#f2f2f2;padding:10px;border:1px solid #ddd;text-align:center;width:14.28%;">Saturday</th>
    </tr>`;
  
  // Collect all posts from all outlines
  const posts = [];
  contentOutlines.forEach((outline, outlineIndex) => {
    // Get up to 3 posts from each outline
    const outlinePosts = outline.posts || [];
    for (let i = 0; i < Math.min(outlinePosts.length, 3); i++) {
      posts.push({
        audience: `audience${outlineIndex + 1}`,
        title: outlinePosts[i].message?.substring(0, 50) || `Post ${i + 1}`,
        type: outlinePosts[i].type || 'Image Post',
        audienceName: outline.audience
      });
    }
  });
  
  // Calculate optimal days to post across 5 weeks (35 days)
  const postDays = {};
  if (posts.length > 0) {
    // Distribute posts evenly
    const postInterval = Math.floor(35 / posts.length);
    let postDate = new Date(startDate);
    postDate.setDate(postDate.getDate() + 2); // Start on Tuesday of first week
    
    posts.forEach((post, index) => {
      const key = postDate.toDateString();
      postDays[key] = post;
      
      // Increment by the calculated interval
      postDate = new Date(postDate);
      postDate.setDate(postDate.getDate() + postInterval);
    });
  }
  
  // Generate 5 weeks of calendar days
  let currentDate = new Date(startDate);
  
  for (let week = 0; week < 5; week++) {
    html += '<tr>';
    
    for (let day = 0; day < 7; day++) {
      const dateString = currentDate.getDate();
      const monthName = monthNames[currentDate.getMonth()];
      const key = currentDate.toDateString();
      
      // Start cell
      html += `<td style="padding:10px;border:1px solid #ddd;height:120px;vertical-align:top;width:14.28%;">`;
      
      // Add date with month name if it's the 1st of the month
      html += `<div style="font-weight:bold;">${dateString === 1 ? `${monthName} ${dateString}` : dateString}</div>`;
      
      // Add post if there is one for this day
      if (postDays[key]) {
        const post = postDays[key];
        let postColor = '#4285f4'; // Default blue
        
        if (post.audience === 'audience2') postColor = '#ea4335'; // Red
        if (post.audience === 'audience3') postColor = '#fbbc05'; // Yellow
        
        html += `<div style="background:${postColor};color:white;padding:5px;margin-top:5px;border-radius:4px;font-size:12px;">
          ${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}
          <br><small>${post.type}</small>
        </div>`;
      }
      
      html += '</td>';
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    html += '</tr>';
  }
  
  html += '</table>';
  return html;
}

export async function chatWithGemini({ businessInfo, strategyMatrix, messages, userMessage }) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    // Enhanced prompt to handle all selection types
    const context = `
      You are a concise social media strategist helping a fitness business owner refine their strategy matrix.
      
      Business Description: ${businessInfo}
      
      Current Strategy Matrix:
      ${JSON.stringify(strategyMatrix, null, 2)}
      
      WORKFLOW:
      1. First, suggest 3 TARGET AUDIENCE options
      2. After user selects an audience, suggest 3 KEY OBJECTIVE options
      3. After objectives are selected, suggest 3 KEY MESSAGE options
      4. Move through audiences one by one until complete
      
      OBJECTIVE GUIDELINES:
      - Focus on specific BEHAVIORS you want the audience to perform
      - Do NOT include specific metrics (no percentages or numbers)
      - Examples: "Sign up for a trial class", "Attend weekly workouts", "Follow meal plans"
      - Make objectives action-oriented and specific to each audience
      
      USER INTERACTIONS:
      - When user selects an audience, they'll send "I selected the audience: [text]"
      - When user selects an objective, they'll send "I selected the objective: [text]"
      - When user selects a message, they'll send "I selected the message: [text]"
      
      RESPONSE FORMAT:
      1. Brief acknowledgment of selection
      2. Then include options for the next appropriate step:
      
      For objectives:
      OBJECTIVE_OPTIONS: {
        "audienceIndex": [index],
        "options": [
          "Behavior-focused objective 1 - what you want them to DO",
          "Behavior-focused objective 2 - different action",
          "Behavior-focused objective 3 - another behavioral goal"
        ]
      }
      
      For audiences:
      AUDIENCE_OPTIONS: {
        "audienceIndex": [index],
        "options": [
          "Audience option 1 - be specific",
          "Audience option 2 - different group",
          "Audience option 3 - another alternative"
        ]
      }
      
      For messages:
      MESSAGE_OPTIONS: {
        "audienceIndex": [index],
        "options": [
          "Message option 1 - compelling and relevant",
          "Message option 2 - different angle",
          "Message option 3 - another approach"
        ]
      }
      
      Keep all responses concise and action-oriented.
    `;
    
    // Format conversation history
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
    
    // Add current user message
    const fullConversation = [
      { role: 'user', parts: [{ text: context }] },
      ...conversationHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    
    const requestBody = {
      contents: fullConversation,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Updated extraction to handle all option types
    let message = textContent;
    let suggestions = null;
    let updateSummary = null;
    let changedCells = [];
    let objectiveOptions = null;
    let audienceOptions = null;
    let messageOptions = null;
    
    // Extract audience options
    const audienceOptionsMatch = textContent.match(/AUDIENCE_OPTIONS:\s*(\{[\s\S]*?\})/);
    if (audienceOptionsMatch) {
      try {
        audienceOptions = JSON.parse(audienceOptionsMatch[1]);
        message = message.replace(/AUDIENCE_OPTIONS:\s*\{[\s\S]*?\}/g, '');
        message = message.trim() + (message.trim().endsWith('.') ? '' : '.') + 
                 '\n\nI\'ve provided some audience options for you to choose from. Click on any option to select it.';
      } catch (e) {
        console.error('Error parsing audience options:', e);
      }
    }
    
    // Extract objective options
    const objectiveOptionsMatch = textContent.match(/OBJECTIVE_OPTIONS:\s*(\{[\s\S]*?\})/);
    if (objectiveOptionsMatch) {
      try {
        objectiveOptions = JSON.parse(objectiveOptionsMatch[1]);
        message = message.replace(/OBJECTIVE_OPTIONS:\s*\{[\s\S]*?\}/g, '');
        message = message.trim() + (message.trim().endsWith('.') ? '' : '.') + 
                 '\n\nI\'ve provided some objective options for you to choose from. Click on any option to select it.';
      } catch (e) {
        console.error('Error parsing objective options:', e);
      }
    }
    
    // Extract message options with better error handling
    const messageOptionsMatch = textContent.match(/MESSAGE_OPTIONS:\s*(\{[\s\S]*?\})/);
    if (messageOptionsMatch) {
      try {
        // Parse the JSON
        let optionsData = messageOptionsMatch[1];
        
        // Replace [index] with a real number if needed
        optionsData = optionsData.replace(/"audienceIndex":\s*\[index\]/, '"audienceIndex": 0');
        
        // Parse the fixed JSON
        messageOptions = JSON.parse(optionsData);
        
        // Update options if the placeholder options are provided
        if (messageOptions.options.some(opt => opt.includes("Message option"))) {
          // Generate real options based on the audience
          const audienceIndex = messageOptions.audienceIndex;
          if (strategyMatrix && strategyMatrix[audienceIndex]) {
            const audience = strategyMatrix[audienceIndex][0];
            const objective = strategyMatrix[audienceIndex][1];
            
            messageOptions.options = [
              `Join our specialized training programs to achieve your ${objective.toLowerCase().includes("weight") ? "weight loss" : "fitness"} goals faster than traditional methods.`,
              `Experience the proven system that has helped hundreds of ${audience.toLowerCase().includes("professionals") ? "busy professionals" : "clients"} transform their bodies.`,
              `Get personalized training and nutrition plans designed specifically for ${audience.toLowerCase().includes("beginners") ? "beginners" : "your fitness level"}.`
            ];
          }
        }
        
        // Clean up the message
        message = message.replace(/MESSAGE_OPTIONS:\s*\{[\s\S]*?\}/g, '');
        message = message.trim() + (message.trim().endsWith('.') ? '' : '.') + 
                 '\n\nI\'ve provided some message options for you to choose from. Click on any option to select it.';
      } catch (e) {
        console.error('Error parsing message options:', e);
      }
    }
    
    // Try to extract the MATRIX_UPDATES section
    const summaryMatch = textContent.match(/MATRIX_UPDATES:(.*?)(\n\n|\n```|\nCHANGED_CELLS)/s);
    if (summaryMatch) {
      updateSummary = summaryMatch[1].trim();
      message = message.replace(/MATRIX_UPDATES:.*?(\n\n|\n```|\nCHANGED_CELLS)/s, '');
    }
    
    // Extract the changed cells coordinates
    const changedCellsMatch = textContent.match(/CHANGED_CELLS:(.*?)(\n\n|\n```)/s);
    if (changedCellsMatch) {
      try {
        changedCells = JSON.parse(changedCellsMatch[1].trim());
        message = message.replace(/CHANGED_CELLS:.*?(\n\n|\n```)/s, '');
      } catch (e) {
        console.error('Error parsing changed cells:', e);
      }
    }
    
    // Look for JSON matrix in the response
    const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[1]);
        message = message.replace(/```json\n[\s\S]*?\n```/, '').trim();
      } catch (e) {
        console.error('Error parsing suggestions:', e);
      }
    }
    
    // Clean up the message - remove any trailing newlines, fix punctuation, etc.
    message = message.replace(/\n{3,}/g, '\n\n').trim();
    
    return { 
      message,
      updateSummary,
      suggestions: suggestions || strategyMatrix,
      changedCells,
      objectiveOptions,
      audienceOptions,
      messageOptions
    };
  } catch (error) {
    console.error('Error calling Gemini API for chat:', error);
    throw error;
  }
}

export async function enhancePostContent(postData, businessInfo, strategyMatrix) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    // Extract post details
    const { audience, objective, postIndex, postType, postTitle } = postData;
    
    // Create contextual prompt with full strategy matrix for context
    const prompt = `
      As a creative social media content specialist for a fitness business, enhance the content for a specific social media post.
      
      BUSINESS INFORMATION:
      ${businessInfo}
      
      FULL STRATEGY MATRIX (for context on all audiences):
      ${JSON.stringify(strategyMatrix, null, 2)}
      
      SPECIFIC POST DETAILS:
      - Audience: ${audience}
      - Objective: ${objective}
      - Post Type: ${postType || 'Image Post'}
      - Post Sequence Position: ${postIndex + 1} of 4
      - Post Purpose: ${postTitle}
      
      CREATE ENHANCED CONTENT FOR THIS SPECIFIC POST:
      1. KEY MESSAGE: Create a specific, focused key message for this post that aligns with the audience needs and objective. KEEP BRIEF - MAXIMUM 120 CHARACTERS.
      
      2. BEHAVIORAL ECONOMICS: Identify 1 specific behavioral economics principle this post will leverage and briefly explain how. KEEP BRIEF - MAXIMUM 150 CHARACTERS.
      
      3. DRAFT CAPTION: Write an engaging, authentic caption with emojis where appropriate and a call-to-action. MAXIMUM 120 CHARACTERS.
      
      4. VISUAL CONCEPT: Describe a specific visual concept for this post. KEEP BRIEF - MAXIMUM 140 CHARACTERS.
      
      IMPORTANT: All lengths are STRICT MAXIMUM character counts. Do not exceed them.
      
      RESPONSE FORMAT:
      Provide your response as a JSON object with these exact keys:
      {
        "keyMessage": "...",
        "behavioralPrinciples": "...",
        "caption": "...",
        "visual": "..."
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1000
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON object
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from content response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing JSON content:', parseError);
      throw new Error('Failed to parse enhanced content');
    }
  } catch (error) {
    console.error('Error generating enhanced post content:', error);
    throw error;
  }
}

// Add a new function to generate detailed summaries for each outline
export async function generateOutlineSummary(businessInfo, audience, objective, posts) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }
  
  try {
    const prompt = `
      As a fitness social media expert, create a concise summary for a sequence of ${posts.length} social media posts targeting the audience "${audience}" with the objective "${objective}".

      POST DETAILS:
      ${posts.map((post, index) => `
        Post ${index + 1}: ${post.type || 'Image Post'}
        Key Message: ${post.message}
        Behavioral Economics: ${post.behavioralPrinciples}
        Visual: ${post.visual}
        Caption: ${post.caption}
      `).join('\n')}
      
      BUSINESS INFORMATION:
      ${businessInfo}

      Provide your response as a JSON object with these exact keys:
      {
        "briefSummary": "One concise sentence summarizing this post sequence",
        "strategicRationale": "Three sentences explaining how this sequence achieves the objective for this audience"
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON object
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from summary response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing JSON summary:', parseError);
      throw new Error('Failed to parse summary content');
    }
  } catch (error) {
    console.error('Error generating outline summary:', error);
    throw error;
  }
}

// Add this function to analyze Instagram posts using Gemini
export async function analyzeInstagramPost(postUrl, postDescription, businessInfo) {
  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  if (!API_KEY) {
    throw new Error('API key not found. Please set the GOOGLE_GEMINI_API_KEY environment variable.');
  }

  try {
    const prompt = `
      As a social media expert for fitness businesses, analyze this Instagram post and provide strategic insights.
      
      INSTAGRAM POST URL: ${postUrl}
      
      POST DESCRIPTION (provided by user): ${postDescription}
      
      BUSINESS INFORMATION:
      ${businessInfo}
      
      Please analyze this Instagram post and provide:
      
      1. ENGAGEMENT ASSESSMENT: What aspects of this post are likely to drive engagement? How could it be improved?
      
      2. AUDIENCE ALIGNMENT: How well does this post align with the target audiences identified in the business description?
      
      3. CONTENT OPTIMIZATION: Specific suggestions to optimize this post (caption improvements, hashtag recommendations, visual elements)
      
      4. STRATEGIC RECOMMENDATIONS: How this post could better support business objectives and fit into an overall content strategy.
      
      Keep your response concise, practical, and formatted with clear headings.
    `;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Convert line breaks to <br> tags for HTML display
    return textContent.replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Error analyzing Instagram post:', error);
    throw error;
  }
} 