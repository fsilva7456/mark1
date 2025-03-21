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
    
    expect(screen.getByText('Loading calendar details...')).toBeInTheDocument();
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
    
    // Setup supabase to return mocked data
    supabase.from.mockImplementation((table) => {
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          if (table === 'calendars') {
            return Promise.resolve({ data: mockCalendar, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
    });
    
    // Mock the posts query specifically
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
    expect(screen.getByText('5')).toBeInTheDocument(); // Posts scheduled
    expect(screen.getByText('2')).toBeInTheDocument(); // Posts published
    expect(screen.getByText('40%')).toBeInTheDocument(); // Progress
    
    // Check that the posts are displayed
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
    
    // Initially only scheduled posts should be shown (default tab)
    expect(screen.getByText('Content for first post')).toBeInTheDocument();
    
    // Switch to "All Posts" tab to see both posts
    fireEvent.click(screen.getByText('All Posts'));
    
    expect(screen.getByText('Content for first post')).toBeInTheDocument();
    expect(screen.getByText('Content for second post')).toBeInTheDocument();
  });

  test('handles empty posts array correctly', async () => {
    // Mock the calendar data with no posts
    const mockCalendar = {
      id: 'calendar-123',
      name: 'Empty Calendar',
      posts_scheduled: 0,
      posts_published: 0,
      progress: 0,
    };
    
    // Setup supabase to return calendar but no posts
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
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      } else if (table === 'content_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
      expect(screen.getByText('Empty Calendar')).toBeInTheDocument();
    });
    
    // Check that the empty state message is displayed
    expect(screen.getByText('No posts found for the selected filter.')).toBeInTheDocument();
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
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockImplementation(() => {
            // First call returns empty array, simulating no existing posts
            return Promise.resolve({ data: [], error: null });
          }),
          // Mock the insert operation to return the newly created posts
          select: jest.fn().mockResolvedValue({ data: mockInsertedPosts, error: null }),
        };
      } else if (table === 'content_plans') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockContentPlan, error: null }),
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