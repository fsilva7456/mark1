import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("DEBUG API: generate-with-insights called");
  
  try {
    const { userData, gymData } = req.body;
    
    console.log("DEBUG API: Received user data:", userData?.name, "and gym data:", gymData?.length);
    
    if (!userData) {
      console.log("DEBUG API: No user data provided");
      return res.status(400).json({ error: 'User data is required' });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      console.log("DEBUG API: No Gemini API key found");
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }
    
    // Format the gym data insights
    const gymInsights = gymData && gymData.length > 0 
      ? gymData.map(gym => `
Gym: ${gym.name || 'Unknown'}
Offerings: ${gym.offerings || 'Not specified'}
What clients like: ${gym.positives || 'Not specified'}
What clients dislike: ${gym.negatives || 'Not specified'}
Target audience: ${gym.targetAudience || 'Not specified'}
Market opportunities: ${gym.opportunities || 'Not specified'}
      `).join('\n---\n')
      : 'No competitor data available';
    
    console.log("DEBUG API: Created gym insights, length:", gymInsights.length);
    
    // Enhanced prompt for Gemini
    const prompt = `
You are a marketing strategy expert for fitness professionals. Create a comprehensive marketing strategy based on user information and competitor insights.

USER INFORMATION:
Name: ${userData.name}
Business Type: ${userData.business}
Target Audience: ${userData.audience}
Marketing Goals: ${userData.goals}
Unique Selling Proposition: ${userData.unique}
Content Preferences: ${userData.content}

COMPETITOR INSIGHTS FROM LOCAL GYMS AND FITNESS BUSINESSES:
${gymInsights}

TASK: 
Create a fully aligned 3x3x3 marketing strategy matrix with:
1. Target Audience (3 specific audience segments)
2. For EACH audience segment, provide 3 specific objectives tailored to that segment
3. For EACH audience segment, provide 3 key messages designed specifically for that segment

ADDITIONAL STRATEGY COMPONENTS:
- For EACH objective, include success metrics to measure effectiveness
- Provide a 90-day implementation timeline showing which elements to focus on first
- Include content type recommendations for each audience segment
- Highlight competitive gaps and how to exploit them

Each element of the matrix should:
- Leverage insights from competitor data to identify gaps and opportunities
- Consider the unique selling proposition of the user's business
- Be specific, actionable, and tailored to the fitness industry
- Help differentiate from competitors in the market

For objectives, focus on specific actions you want the target audience to take, 
not on vague goals. Examples include: "Sign up for a free trial class", 
"Download a meal planning guide", or "Schedule a personal training consultation".

Return your response in this JSON format ONLY:
{
  "audiences": [
    {
      "segment": "First audience segment with specific details",
      "objectives": [
        {
          "objective": "Specific marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Second marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Third marketing objective for this segment",
          "successMetrics": "How to measure success for this objective", 
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        }
      ],
      "keyMessages": [
        "First compelling message specifically for this audience",
        "Second compelling message specifically for this audience",
        "Third compelling message specifically for this audience"
      ],
      "channels": ["Primary channel 1", "Primary channel 2"]
    },
    {
      "segment": "Second audience segment with specific details",
      "objectives": [
        {
          "objective": "Specific marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Second marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Third marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        }
      ],
      "keyMessages": [
        "First compelling message specifically for this audience",
        "Second compelling message specifically for this audience",
        "Third compelling message specifically for this audience"
      ],
      "channels": ["Primary channel 1", "Primary channel 2"]
    },
    {
      "segment": "Third audience segment with specific details",
      "objectives": [
        {
          "objective": "Specific marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Second marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        },
        {
          "objective": "Third marketing objective for this segment",
          "successMetrics": "How to measure success for this objective",
          "contentTypes": ["Recommended content type 1", "Recommended content type 2"]
        }
      ],
      "keyMessages": [
        "First compelling message specifically for this audience",
        "Second compelling message specifically for this audience",
        "Third compelling message specifically for this audience"
      ],
      "channels": ["Primary channel 1", "Primary channel 2"]
    }
  ],
  "implementationTimeline": {
    "phase1_days1_30": ["Priority tasks for first 30 days"],
    "phase2_days31_60": ["Priority tasks for days 31-60"],
    "phase3_days61_90": ["Priority tasks for days 61-90"]
  },
  "competitiveGaps": {
    "identifiedGaps": ["Competitive gap 1", "Competitive gap 2"],
    "exploitationStrategies": ["Strategy to exploit gap 1", "Strategy to exploit gap 2"]
  },
  "contentStrategy": {
    "tone": "Recommended content tone and style",
    "frequencyRecommendation": "Suggested posting frequency",
    "callToActionLibrary": ["Effective CTA 1", "Effective CTA 2", "Effective CTA 3"],
    "abTestRecommendations": ["A/B test idea 1", "A/B test idea 2"]
  }
}

Ensure your response is complete, strategic, and provides clear guidance on implementation.
`;

    // Call Gemini API to generate the strategy with enhanced parameters
    try {
      console.log("DEBUG API: Initializing Gemini model");
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash', 
        generationConfig: {
          temperature: 0.2, // Lower temperature for more consistent output
          topP: 0.95,
          maxOutputTokens: 4000, // Allow for larger responses
        }
      });
      
      console.log("DEBUG API: Sending prompt to Gemini");
      const result = await model.generateContent(prompt);
      
      console.log("DEBUG API: Received response from Gemini");
      const responseText = result.response.text();
      
      // Parse JSON from the response
      let enhancedMatrix;
      try {
        // Try to extract JSON if it's wrapped in markdown code block
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                         responseText.match(/```\n([\s\S]*?)\n```/) ||
                         responseText.match(/{[\s\S]*?}/);
                         
        if (jsonMatch) {
          const jsonText = jsonMatch[1] ? jsonMatch[1] : jsonMatch[0];
          enhancedMatrix = JSON.parse(jsonText);
          
          // Convert enhanced matrix to old format compatibility while maintaining the new extended data
          const compatibilityMatrix = {
            // Keep the old format keys for backward compatibility
            targetAudience: enhancedMatrix.audiences ? enhancedMatrix.audiences.map(a => a.segment) : [],
            objectives: enhancedMatrix.audiences ? 
              enhancedMatrix.audiences.flatMap(a => a.objectives).slice(0, 3).map(o => o.objective) : [],
            keyMessages: enhancedMatrix.audiences ? 
              enhancedMatrix.audiences.flatMap(a => a.keyMessages).slice(0, 3) : [],
            
            // Add the new enhanced data structure
            enhancedStrategy: enhancedMatrix
          };
          
          return res.status(200).json({ matrix: compatibilityMatrix });
        } else {
          throw new Error('Failed to extract JSON from response');
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.log('Raw response:', responseText);
        
        // Create a fallback matrix in the enhanced format
        const fallbackMatrix = {
          targetAudience: [
            `${userData.audience} seeking personalized fitness solutions`,
            `Busy professionals looking for efficient workout options`,
            `Fitness enthusiasts wanting to reach new goals`
          ],
          objectives: [
            `Attract new clients through targeted content marketing`,
            `Build a reputation as a trusted fitness provider`,
            `Convert prospects to paying clients through effective messaging`
          ],
          keyMessages: [
            `Experience a fitness approach tailored to your specific needs`,
            `Achieve your goals faster with our proven fitness systems`,
            `Join a supportive community that helps you stay accountable`
          ],
          enhancedStrategy: createFallbackEnhancedMatrix(userData)
        };
        
        return res.status(200).json({ matrix: fallbackMatrix });
      }
    } catch (geminiError) {
      console.error('DEBUG API: Error calling Gemini API:', geminiError);
      
      // Create a basic fallback matrix in the enhanced format
      const fallbackMatrix = {
        targetAudience: [
          `${userData.audience} seeking personalized fitness solutions`,
          `Busy professionals looking for efficient workout options`,
          `Fitness enthusiasts wanting to reach new goals`
        ],
        objectives: [
          `Attract new clients through targeted content marketing`,
          `Build a reputation as a trusted fitness provider`,
          `Convert prospects to paying clients through effective messaging`
        ],
        keyMessages: [
          `Experience a fitness approach tailored to your specific needs`,
          `Achieve your goals faster with our proven fitness systems`,
          `Join a supportive community that helps you stay accountable`
        ],
        enhancedStrategy: createFallbackEnhancedMatrix(userData)
      };
      
      return res.status(200).json({ matrix: fallbackMatrix });
    }
  } catch (error) {
    console.error('DEBUG API: Error generating enhanced strategy:', error);
    return res.status(500).json({ 
      error: 'Failed to generate enhanced strategy',
      details: error.message 
    });
  }
}

// Helper function to create a fallback enhanced matrix
function createFallbackEnhancedMatrix(userData) {
  const businessType = userData.business || 'fitness business';
  const audience = userData.audience || 'fitness enthusiasts';
  const unique = userData.unique || 'personalized approach';
  
  return {
    audiences: [
      {
        segment: `${audience} seeking personalized fitness solutions`,
        objectives: [
          {
            objective: "Book a free consultation session",
            successMetrics: "Number of consultation bookings per month",
            contentTypes: ["Before/After testimonials", "Educational posts about fitness myths"]
          },
          {
            objective: "Sign up for a 7-day trial program",
            successMetrics: "Trial program sign-up rate",
            contentTypes: ["Workout demonstrations", "Client success stories"]
          },
          {
            objective: "Follow and engage with social media content",
            successMetrics: "Follower growth rate and engagement metrics",
            contentTypes: ["Quick tips", "Day-in-the-life content"]
          }
        ],
        keyMessages: [
          `Experience personalized fitness guidance tailored to your unique needs and goals`,
          `Join a supportive community that keeps you accountable and motivated`,
          `Achieve sustainable results through our proven methodology`
        ],
        channels: ["Instagram", "Facebook", "Email marketing"]
      },
      {
        segment: `Busy professionals looking for efficient workout options`,
        objectives: [
          {
            objective: "Subscribe to the time-saving workout newsletter",
            successMetrics: "Newsletter subscription rate",
            contentTypes: ["Quick workout routines", "Efficiency tips"]
          },
          {
            objective: "Book high-efficiency training sessions",
            successMetrics: "Conversion rate from busy professionals segment",
            contentTypes: ["Time-saving workout videos", "Client testimonials from professionals"]
          },
          {
            objective: "Download the workout planning app/guide",
            successMetrics: "Download and active usage rates",
            contentTypes: ["App tutorials", "Productivity content"]
          }
        ],
        keyMessages: [
          `Maximize results with minimum time investment through our efficient training methods`,
          `Fit effective workouts into your busy schedule with our flexible options`,
          `Experience the benefits of expert guidance without the time commitment`
        ],
        channels: ["LinkedIn", "Email marketing", "Google Ads"]
      },
      {
        segment: `Fitness enthusiasts wanting to reach new goals`,
        objectives: [
          {
            objective: "Upgrade to advanced training programs",
            successMetrics: "Upgrade conversion rate from basic to advanced programs",
            contentTypes: ["Advanced technique tutorials", "Progress tracking content"]
          },
          {
            objective: "Join specialized fitness challenges",
            successMetrics: "Challenge participation rate",
            contentTypes: ["Challenge announcements", "Participant spotlights"]
          },
          {
            objective: "Purchase specialized equipment or supplements",
            successMetrics: "Affiliate link conversion rate",
            contentTypes: ["Equipment reviews", "Nutrition guidance"]
          }
        ],
        keyMessages: [
          `Break through plateaus with our specialized advanced training protocols`,
          `Join a community of dedicated fitness enthusiasts who push each other to excel`,
          `Access expert guidance to safely push your limits and achieve new personal bests`
        ],
        channels: ["Instagram", "YouTube", "TikTok"]
      }
    ],
    implementationTimeline: {
      phase1_days1_30: [
        "Set up primary social media channels and content calendar",
        "Create lead magnet for main audience segment",
        "Develop initial content batch focusing on key messages"
      ],
      phase2_days31_60: [
        "Launch first audience-specific campaign",
        "Implement email marketing automation",
        "Begin A/B testing key messages"
      ],
      phase3_days61_90: [
        "Expand to secondary audience segments",
        "Refine strategy based on initial data",
        "Scale successful content types across channels"
      ]
    },
    competitiveGaps: {
      identifiedGaps: [
        "Personalized approach vs. generic programs from larger competitors",
        "Community building that larger gyms often neglect",
        "Specialized expertise in your unique fitness approach"
      ],
      exploitationStrategies: [
        "Highlight personal attention in all marketing materials",
        "Showcase community aspects through client spotlights and events",
        "Create educational content that demonstrates your specialized knowledge"
      ]
    },
    contentStrategy: {
      tone: "Professional yet approachable, emphasizing expertise with empathy",
      frequencyRecommendation: "3-5 posts per week, with additional stories daily",
      callToActionLibrary: [
        "Book your free consultation today",
        "Join our 7-day challenge to see the difference",
        "Download our guide to efficient workouts",
        "Follow us for daily fitness inspiration and tips",
        "Share your journey with our supportive community"
      ],
      abTestRecommendations: [
        "Test direct vs. indirect call-to-actions in posts",
        "Compare engagement between educational content vs. inspirational content",
        "Test different headline formats for email campaigns"
      ]
    }
  };
} 