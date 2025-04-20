import logger from '@lib/logger';

const log = logger.createLogger('DateUtils');

/**
 * Get the start of week date (Monday) for a given date
 * @param {Date} date - The date to get the start of week for
 * @returns {Date} The start of week date (Monday)
 */
export const getStartOfWeek = (date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/**
 * Calculate the week number relative to current week
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {number} Week number (0 = current week, 1 = next week, etc.)
 */
export const getWeekNumber = (dateInput) => {
  try {
    // Convert input to Date object if it's a string
    const inputDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    // Validate the date is valid
    if (isNaN(inputDate.getTime())) {
      log.error('Invalid date in getWeekNumber', { dateString: dateInput });
      return -1; // Invalid date
    }
    
    // Get start of current week
    const now = new Date();
    const currentWeekStart = getStartOfWeek(now);
    
    // Get start of the input date's week
    const inputWeekStart = getStartOfWeek(inputDate);
    
    // Calculate difference in weeks
    const diffTime = inputWeekStart.getTime() - currentWeekStart.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const weekNumber = Math.floor(diffDays / 7);

    log.debug('Week calculation result', {
      inputDate: inputDate.toISOString(),
      currentWeekStart: currentWeekStart.toISOString(),
      inputWeekStart: inputWeekStart.toISOString(),
      diffDays,
      weekNumber
    });
    
    return weekNumber;
  } catch (error) {
    log.error('Error in getWeekNumber', { 
      error: error.message, 
      dateString: dateInput 
    });
    return -1;
  }
};

/**
 * Group posts by week (0 = current week, 1 = next week, 2 = week after)
 * @param {Array} posts - Array of post objects
 * @returns {Array} Array of 3 arrays, each containing posts for a week
 */
export const groupPostsByWeek = (posts) => {
  // Create an array to hold three weeks of posts
  const weeks = [[], [], []];

  if (!posts || posts.length === 0) {
    log.warn('No posts data provided to groupPostsByWeek');
    return weeks;
  }

  // Sort posts by scheduled_date
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)
  );

  // Group posts by week relative to current date
  sortedPosts.forEach(post => {
    const weekNumber = getWeekNumber(post.scheduled_date);
    
    // Only include posts for current week (0), next week (1), and week after (2)
    if (weekNumber >= 0 && weekNumber <= 2) {
      weeks[weekNumber].push(post);
    }
  });

  log.debug('Grouped posts by week', {
    week0Count: weeks[0].length,
    week1Count: weeks[1].length,
    week2Count: weeks[2].length
  });

  return weeks;
};

/**
 * Get posts scheduled for a specific date
 * @param {Date} date - The date to get posts for
 * @param {Array} posts - Array of post objects for the week
 * @returns {Array} Posts scheduled for the given date
 */
export const getPostsForDay = (date, posts) => {
  const dateStr = date.toISOString().split('T')[0];
  
  return posts.filter(post => {
    const postDate = new Date(post.scheduled_date);
    const postDateStr = postDate.toISOString().split('T')[0];
    return postDateStr === dateStr;
  });
};

/**
 * Generate an array of dates for a given week
 * @param {number} weekIndex - Week index (0 = current week, 1 = next week, etc.)
 * @returns {Array} Array of 7 Date objects for the week
 */
export const getWeekDates = (weekIndex) => {
  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  
  // Adjust for the week index
  const weekStart = new Date(startOfWeek);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  return days;
};