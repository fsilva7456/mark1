import { supabase } from '../lib/supabase';
import { subDays, format, parseISO, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns';

/**
 * Generates AI content suggestions based on:
 * 1. Recent engagement metrics
 * 2. Current content strategy
 * 3. Gaps in the current calendar
 * 
 * @param {string} calendarId - The calendar ID to analyze
 * @returns {Promise<Array>} - Array of suggestion objects
 */
export async function generateSuggestions(calendarId) {
  try {
    // Fetch recent engagement metrics (last 14 days)
    const fourteenDaysAgo = subDays(new Date(), 14).toISOString();
    const { data: postsWithEngagement, error: postsError } = await supabase
      .from('calendar_posts')
      .select('*')
      .eq('calendar_id', calendarId)
      .eq('status', 'published')
      .gte('scheduled_date', fourteenDaysAgo)
      .order('scheduled_date', { ascending: false });
    
    if (postsError) throw postsError;

    // Fetch current content strategy
    const { data: strategyData, error: strategyError } = await supabase
      .from('content_strategies')
      .select('*')
      .eq('calendar_id', calendarId)
      .single();
    
    if (strategyError && strategyError.code !== 'PGRST116') throw strategyError;

    // Fetch current 3-week calendar (today + 2 weeks forward)
    const today = new Date();
    const threeWeeksLater = addWeeks(today, 3).toISOString();
    
    const { data: calendarPosts, error: calendarError } = await supabase
      .from('calendar_posts')
      .select('*')
      .eq('calendar_id', calendarId)
      .gte('scheduled_date', today.toISOString())
      .lte('scheduled_date', threeWeeksLater)
      .order('scheduled_date', { ascending: true });
    
    if (calendarError) throw calendarError;

    // Generate suggestions based on the data
    const suggestions = [];
    
    // 1. Analyze engagement metrics
    const engagementSuggestion = analyzeEngagementMetrics(postsWithEngagement);
    if (engagementSuggestion) suggestions.push(engagementSuggestion);
    
    // 2. Analyze content strategy
    const strategySuggestion = analyzeContentStrategy(strategyData, calendarPosts);
    if (strategySuggestion) suggestions.push(strategySuggestion);
    
    // 3. Analyze calendar gaps
    const calendarSuggestion = analyzeCalendarGaps(calendarPosts);
    if (calendarSuggestion) suggestions.push(calendarSuggestion);
    
    // If we don't have 3 suggestions yet, add some generic ones
    while (suggestions.length < 3) {
      suggestions.push(generateGenericSuggestion(suggestions.length + 1));
    }
    
    // Limit to 3 suggestions and add unique IDs
    return suggestions.slice(0, 3).map((suggestion, index) => ({
      ...suggestion,
      id: `suggestion-${index + 1}`
    }));
    
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [
      {
        id: 'error-1',
        title: 'Unable to generate suggestions',
        description: 'There was an error analyzing your content data. Please try again later.',
        actionLabel: 'Refresh',
        actionRoute: '#refresh',
        priority: 'low'
      }
    ];
  }
}

/**
 * Analyzes engagement metrics to generate a suggestion
 */
function analyzeEngagementMetrics(posts) {
  if (!posts || posts.length === 0) {
    return {
      title: 'Start tracking engagement',
      description: 'Add engagement metrics to your published posts to unlock personalized content recommendations.',
      actionLabel: 'Enter Metrics',
      actionRoute: '/engagement',
      priority: 'medium'
    };
  }
  
  // Calculate average engagement by platform
  const platformEngagement = {};
  let bestPlatform = null;
  let bestEngagementRate = 0;
  
  posts.forEach(post => {
    if (post.platform && post.engagement) {
      if (!platformEngagement[post.platform]) {
        platformEngagement[post.platform] = {
          totalEngagement: 0,
          totalReach: 0,
          postCount: 0
        };
      }
      
      const engagement = post.engagement.likes + post.engagement.comments + post.engagement.shares;
      const reach = post.engagement.reach || 1;
      
      platformEngagement[post.platform].totalEngagement += engagement;
      platformEngagement[post.platform].totalReach += reach;
      platformEngagement[post.platform].postCount += 1;
    }
  });
  
  // Find best performing platform
  Object.keys(platformEngagement).forEach(platform => {
    const { totalEngagement, totalReach, postCount } = platformEngagement[platform];
    if (postCount > 0) {
      const engagementRate = totalEngagement / totalReach;
      if (engagementRate > bestEngagementRate) {
        bestEngagementRate = engagementRate;
        bestPlatform = platform;
      }
    }
  });
  
  if (bestPlatform) {
    return {
      title: `Boost ${bestPlatform} content`,
      description: `${bestPlatform} has your highest engagement rate. Consider creating more content for this platform.`,
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'high'
    };
  }
  
  // Analyze content types (if info available)
  const contentTypes = {};
  let bestType = null;
  let bestTypeEngagement = 0;
  
  posts.forEach(post => {
    if (post.content_type && post.engagement) {
      if (!contentTypes[post.content_type]) {
        contentTypes[post.content_type] = {
          totalEngagement: 0,
          postCount: 0
        };
      }
      
      const engagement = post.engagement.likes + post.engagement.comments + post.engagement.shares;
      contentTypes[post.content_type].totalEngagement += engagement;
      contentTypes[post.content_type].postCount += 1;
    }
  });
  
  Object.keys(contentTypes).forEach(type => {
    const { totalEngagement, postCount } = contentTypes[type];
    if (postCount > 0) {
      const avgEngagement = totalEngagement / postCount;
      if (avgEngagement > bestTypeEngagement) {
        bestTypeEngagement = avgEngagement;
        bestType = type;
      }
    }
  });
  
  if (bestType) {
    return {
      title: `Create more ${bestType} content`,
      description: `${bestType} posts get higher engagement. Try adding more of these to your content calendar.`,
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'high'
    };
  }
  
  return {
    title: 'Increase posting frequency',
    description: 'Your engagement metrics show regular posting increases overall audience reach. Try posting more consistently.',
    actionLabel: 'Add to Calendar',
    actionRoute: '/post-editor/new',
    priority: 'medium'
  };
}

/**
 * Analyzes content strategy to generate a suggestion
 */
function analyzeContentStrategy(strategy, calendarPosts) {
  if (!strategy) {
    return {
      title: 'Define your content strategy',
      description: 'Creating a content strategy will help guide your posts and unlock better AI suggestions.',
      actionLabel: 'Review Strategy',
      actionRoute: '/strategy/refresh',
      priority: 'high'
    };
  }
  
  // Check if strategy is outdated (over 30 days old)
  const strategyDate = strategy.updated_at ? new Date(strategy.updated_at) : new Date(strategy.created_at);
  const daysSinceUpdate = Math.floor((new Date() - strategyDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceUpdate > 30) {
    return {
      title: 'Update your content strategy',
      description: `Your strategy hasn't been updated in ${daysSinceUpdate} days. Review and refresh it for better results.`,
      actionLabel: 'Review Strategy',
      actionRoute: '/strategy/refresh',
      priority: 'medium'
    };
  }
  
  // Check if target platforms in strategy are utilized in calendar
  if (strategy.target_platforms && Array.isArray(strategy.target_platforms)) {
    const platformUsage = {};
    strategy.target_platforms.forEach(platform => {
      platformUsage[platform] = 0;
    });
    
    calendarPosts.forEach(post => {
      if (post.platform && platformUsage[post.platform] !== undefined) {
        platformUsage[post.platform]++;
      }
    });
    
    // Find unused or underused platforms
    const unusedPlatforms = Object.keys(platformUsage).filter(platform => platformUsage[platform] === 0);
    const underusedPlatforms = Object.keys(platformUsage).filter(platform => platformUsage[platform] < 2);
    
    if (unusedPlatforms.length > 0) {
      return {
        title: `Add content for ${unusedPlatforms[0]}`,
        description: `Your strategy includes ${unusedPlatforms[0]} but you have no scheduled posts for this platform.`,
        actionLabel: 'Add to Calendar',
        actionRoute: '/post-editor/new',
        priority: 'high'
      };
    }
    
    if (underusedPlatforms.length > 0) {
      return {
        title: `Increase ${underusedPlatforms[0]} content`,
        description: `Your strategy prioritizes ${underusedPlatforms[0]} but you have few posts scheduled for this platform.`,
        actionLabel: 'Add to Calendar',
        actionRoute: '/post-editor/new',
        priority: 'medium'
      };
    }
  }
  
  // Check for content themes from strategy
  if (strategy.themes && Array.isArray(strategy.themes) && strategy.themes.length > 0) {
    const randomThemeIndex = Math.floor(Math.random() * strategy.themes.length);
    const theme = strategy.themes[randomThemeIndex];
    
    return {
      title: `Create content for "${theme}" theme`,
      description: `Your strategy includes "${theme}" as a key theme. Add content that aligns with this theme.`,
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    };
  }
  
  return {
    title: 'Align with strategic goals',
    description: 'Review your upcoming content to ensure it aligns with your brand voice and marketing objectives.',
    actionLabel: 'Review Strategy',
    actionRoute: '/strategy/refresh',
    priority: 'low'
  };
}

/**
 * Analyzes calendar gaps to generate a suggestion
 */
function analyzeCalendarGaps(calendarPosts) {
  if (!calendarPosts || calendarPosts.length === 0) {
    return {
      title: 'Start planning your content',
      description: 'Your calendar is empty. Begin by scheduling some posts for the upcoming weeks.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'high'
    };
  }
  
  // Check for empty days in the next week
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
  
  // Create array of the next 7 days
  const nextSevenDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));
  
  // Check which days have posts
  const daysWithPosts = nextSevenDays.map(day => {
    return calendarPosts.some(post => {
      const postDate = new Date(post.scheduled_date);
      return isSameDay(postDate, day);
    });
  });
  
  // Find the first day without a post
  const emptyDayIndex = daysWithPosts.findIndex(hasPost => !hasPost);
  
  if (emptyDayIndex !== -1) {
    const emptyDay = nextSevenDays[emptyDayIndex];
    const dayName = format(emptyDay, 'EEEE');
    
    return {
      title: `Fill gap on ${dayName}`,
      description: `You don't have any content scheduled for ${dayName}. Consider adding a post to maintain consistency.`,
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    };
  }
  
  // Check for content diversity
  const contentTypes = {};
  calendarPosts.forEach(post => {
    if (post.content_type) {
      contentTypes[post.content_type] = (contentTypes[post.content_type] || 0) + 1;
    }
  });
  
  if (Object.keys(contentTypes).length <= 1) {
    return {
      title: 'Diversify your content',
      description: 'Try adding different types of content (videos, images, carousels) to engage your audience in various ways.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    };
  }
  
  // Check for platform diversity
  const platforms = {};
  calendarPosts.forEach(post => {
    if (post.platform) {
      platforms[post.platform] = (platforms[post.platform] || 0) + 1;
    }
  });
  
  if (Object.keys(platforms).length <= 1) {
    return {
      title: 'Expand to more platforms',
      description: 'Posting on multiple platforms can help reach different audience segments. Try adding content for another platform.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'low'
    };
  }
  
  return {
    title: 'Optimize posting times',
    description: 'Consider scheduling posts at different times of day to determine when your audience is most engaged.',
    actionLabel: 'Add to Calendar',
    actionRoute: '/post-editor/new',
    priority: 'low'
  };
}

/**
 * Generate a generic suggestion as a fallback
 */
function generateGenericSuggestion(index) {
  const suggestions = [
    {
      title: 'Try a video post',
      description: 'Video content typically gets higher engagement rates. Consider adding a short video to your content mix.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    },
    {
      title: 'Repurpose successful content',
      description: 'Look at your highest performing posts and consider repurposing them for different platforms.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'low'
    },
    {
      title: 'Review your strategy',
      description: 'Regularly reviewing your content strategy helps ensure your content aligns with your marketing goals.',
      actionLabel: 'Review Strategy',
      actionRoute: '/strategy/refresh',
      priority: 'low'
    },
    {
      title: 'Create a themed series',
      description: 'Themed content series can boost audience retention and engagement with your brand.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    },
    {
      title: 'Try user-generated content',
      description: 'Featuring content from your customers can increase authenticity and build community.',
      actionLabel: 'Add to Calendar',
      actionRoute: '/post-editor/new',
      priority: 'medium'
    }
  ];
  
  // Get a suggestion based on the index (wrapped around if needed)
  return suggestions[index % suggestions.length];
} 