/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CalendarManagement from '../../pages/calendar/[id]';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Mock the auth context
jest.mock('../../contexts/AuthContext');

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create router mock object first
const mockRouterPush = jest.fn();
const mockRouterQuery = { id: 'calendar-123' };

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: mockRouterQuery,
    isReady: true,
  }),
}));

describe('CalendarManagement', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock auth context default values
    useAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    });
  });

  test('redirects to home if user is not logged in', async () => {
    // Setup auth to return no user
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });
    
    render(<CalendarManagement />);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });
  });

  test('displays loading state while fetching calendar data', () => {
    render(<CalendarManagement />);
    
    expect(screen.getByText('Loading your calendar...')).toBeInTheDocument();
  });

  test('fetches and displays calendar data with posts', async () => {
    // Mock the calendar data
    const mockCalendar = {
      id: 'calendar-123',
      name: 'Test Calendar',
      posts_scheduled: 5,
      posts_published: 2,
      progress: 40,
    };
    
    // Mock the posts data
    const mockPosts = [
      {
        id: 'post-1',
        title: 'First Post',
        content: 'Content for first post',
        post_type: 'Carousel',
        channel: 'Instagram',
        scheduled_date: '2023-07-15T10:00:00.000Z',
        status: 'scheduled',
      },
      {
        id: 'post-2',
        title: 'Second Post',
        content: 'Content for second post',
        post_type: 'Video',
        channel: 'YouTube',
        scheduled_date: '2023-07-16T10:00:00.000Z',
        status: 'published',
      },
    ];
    
    // Setup supabase mocks for each specific table
    supabase.from.mockImplementation((table) => {
      if (table === 'calendars') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCalendar, error: null }),
        };
      } else if (table === 'calendar_posts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockPosts, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
    });
    
    render(<CalendarManagement />);
    
    // Wait for the calendar data to load
    await waitFor(() => {
      expect(screen.getByText('Test Calendar')).toBeInTheDocument();
    });
    
    // Check that the stats are displayed
    expect(screen.getByText('5')).toBeInTheDocument(); // Total posts scheduled
    expect(screen.getByText('2')).toBeInTheDocument(); // Posts published
    expect(screen.getByText('40%')).toBeInTheDocument(); // Progress
    
    // Check that the posts are displayed in the table
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
  });

  test('creates default posts when no posts and no content plan exists', async () => {
    // Mock the calendar data
    const mockCalendar = {
      id: 'calendar-123',
      name: 'Empty Calendar',
      posts_scheduled: 0,
      posts_published: 0,
      progress: 0,
    };
    
    // Mock the default posts that will be created
    const mockDefaultPosts = Array(8).fill(null).map((_, index) => ({
      id: `default-post-${index}`,
      calendar_id: 'calendar-123',
      title: `Week ${Math.floor(index/2) + 1} Post for Instagram`,
      content: `Default content for Empty Calendar - Week ${Math.floor(index/2) + 1}`,
      post_type: 'Image Post',
      status: 'scheduled',
    }));
    
    let calendarPostsQueryCount = 0;
    
    // Setup supabase to return calendar but no posts and no content plan
    supabase.from.mockImplementation((table) => {
      if (table === 'calendars') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCalendar, error: null }),
        };
      } else if (table === 'calendar_posts') {
        calendarPostsQueryCount++;
        
        if (calendarPostsQueryCount === 1) {
          // First query returns no posts
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        } else {
          // Subsequent queries are for insert operations
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: mockDefaultPosts, error: null }),
          };
        }
      } else if (table === 'content_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // Return empty array to simulate no content plans
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
    });
    
    render(<CalendarManagement />);
    
    // Wait for the calendar data and default posts to load
    await waitFor(() => {
      expect(screen.getByText('Empty Calendar')).toBeInTheDocument();
    });
    
    // Check that default posts are created and displayed
    await waitFor(() => {
      // Should find at least one of the default posts
      expect(screen.getByText(/Week 1 Post for Instagram/)).toBeInTheDocument();
    });
  });

  test('creates posts from content plan when no posts exist', async () => {
    // Mock the calendar data
    const mockCalendar = {
      id: 'calendar-123',
      name: 'New Calendar',
      posts_scheduled: 0,
      posts_published: 0,
      progress: 0,
    };
    
    // Mock the content plan data
    const mockContentPlan = {
      id: 'plan-123',
      calendar_id: 'calendar-123',
      campaigns: [
        {
          week: 1,
          theme: 'Introduction',
          posts: [
            {
              topic: 'Welcome Post',
              type: 'Image',
              audience: 'New Followers',
            },
            {
              topic: 'About Us',
              type: 'Carousel',
              audience: 'All Followers',
            },
          ],
        },
      ],
    };
    
    // Mock the inserted posts
    const mockInsertedPosts = [
      {
        id: 'new-post-1',
        calendar_id: 'calendar-123',
        title: 'Welcome Post',
        content: 'Welcome Post',
        post_type: 'Image',
        target_audience: 'New Followers',
        status: 'scheduled',
      },
      {
        id: 'new-post-2',
        calendar_id: 'calendar-123',
        title: 'About Us',
        content: 'About Us',
        post_type: 'Carousel',
        target_audience: 'All Followers',
        status: 'scheduled',
      },
    ];
    
    let calendarPostsQueryCount = 0;
    
    // Setup supabase mocks for this test case
    supabase.from.mockImplementation((table) => {
      if (table === 'calendars') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCalendar, error: null }),
        };
      } else if (table === 'calendar_posts') {
        calendarPostsQueryCount++;
        
        if (calendarPostsQueryCount === 1) {
          // First query returns no posts
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        } else {
          // Subsequent queries are for insert operations
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: mockInsertedPosts, error: null }),
          };
        }
      } else if (table === 'content_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // Return array with one content plan
          select: jest.fn().mockResolvedValue({ data: [mockContentPlan], error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
    });
    
    render(<CalendarManagement />);
    
    // Wait for posts to be created and displayed
    await waitFor(() => {
      expect(screen.getByText('Welcome Post')).toBeInTheDocument();
      expect(screen.getByText('About Us')).toBeInTheDocument();
    });
  });
}); 