/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MarketingPlanDashboard from '../../pages/marketing-plan';
import { useAuth } from '../../contexts/AuthContext';
import { useMarketingPlan } from '../../contexts/MarketingPlanContext';

// Mock the auth context
jest.mock('../../contexts/AuthContext');

// Mock the marketing plan context
jest.mock('../../contexts/MarketingPlanContext');

// Create router mock object first
const mockRouterPush = jest.fn();

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/marketing-plan',
    query: {},
    isReady: true,
  }),
}));

describe('MarketingPlanDashboard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock auth context default values
    useAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    });
    
    // Mock marketing plan context default values
    useMarketingPlan.mockReturnValue({
      strategies: [],
      contentOutlines: [],
      calendars: [],
      isLoading: false,
      error: null,
      refreshData: jest.fn(),
      getOutlinesForStrategy: jest.fn(() => []),
      getCalendarsForStrategy: jest.fn(() => []),
      deleteMarketingEntity: jest.fn(),
      logAction: jest.fn(),
    });
  });
  
  it('redirects to login if user is not authenticated', async () => {
    // Mock unauthenticated user
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });
    
    render(<MarketingPlanDashboard />);
    
    // Check if the router.push was called with '/login'
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });
  
  it('shows loading state when data is loading', () => {
    // Mock loading state
    useMarketingPlan.mockReturnValue({
      ...useMarketingPlan(),
      isLoading: true,
    });
    
    render(<MarketingPlanDashboard />);
    
    expect(screen.getByText('Loading your marketing plan data...')).toBeInTheDocument();
  });
  
  it('shows error state when there is an error', () => {
    // Mock error state
    useMarketingPlan.mockReturnValue({
      ...useMarketingPlan(),
      error: 'Failed to load marketing plan data',
    });
    
    render(<MarketingPlanDashboard />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load marketing plan data')).toBeInTheDocument();
  });
  
  it('shows empty state when there are no strategies', () => {
    render(<MarketingPlanDashboard />);
    
    expect(screen.getByText('No marketing plans yet')).toBeInTheDocument();
    expect(screen.getByText('Start by creating a marketing strategy')).toBeInTheDocument();
  });
  
  it('renders strategies in workflow view', () => {
    // Mock strategies data
    useMarketingPlan.mockReturnValue({
      ...useMarketingPlan(),
      strategies: [
        {
          id: 'strategy-123',
          name: 'Test Strategy',
          created_at: '2023-01-01T00:00:00Z',
          business_description: 'Test business',
          target_audience: ['Audience 1', 'Audience 2'],
        },
      ],
    });
    
    render(<MarketingPlanDashboard />);
    
    expect(screen.getByText('Test Strategy')).toBeInTheDocument();
    expect(screen.getByText('0 outlines')).toBeInTheDocument();
    expect(screen.getByText('0 calendars')).toBeInTheDocument();
  });
  
  it('renders full workflow when data is available', () => {
    // Mock complete data
    const mockStrategy = {
      id: 'strategy-123',
      name: 'Test Strategy',
      created_at: '2023-01-01T00:00:00Z',
      business_description: 'Test business',
      target_audience: ['Audience 1', 'Audience 2'],
    };
    
    const mockOutline = {
      id: 'outline-123',
      strategy_id: 'strategy-123',
      created_at: '2023-01-02T00:00:00Z',
      outline: [
        { week: 1, theme: 'Week 1 Theme', posts: [] },
        { week: 2, theme: 'Week 2 Theme', posts: [] },
      ],
    };
    
    const mockCalendar = {
      id: 'calendar-123',
      strategy_id: 'strategy-123',
      name: 'Test Calendar',
      created_at: '2023-01-03T00:00:00Z',
      progress: 50,
      posts_scheduled: 10,
      posts_published: 5,
    };
    
    useMarketingPlan.mockReturnValue({
      ...useMarketingPlan(),
      strategies: [mockStrategy],
      contentOutlines: [mockOutline],
      calendars: [mockCalendar],
      getOutlinesForStrategy: jest.fn(() => [mockOutline]),
      getCalendarsForStrategy: jest.fn(() => [mockCalendar]),
    });
    
    render(<MarketingPlanDashboard />);
    
    expect(screen.getByText('Test Strategy')).toBeInTheDocument();
    expect(screen.getByText('1 outlines')).toBeInTheDocument();
    expect(screen.getByText('1 calendars')).toBeInTheDocument();
    expect(screen.getByText('Content Outline')).toBeInTheDocument();
    expect(screen.getByText('Test Calendar')).toBeInTheDocument();
    
    // Check progress text using data-testid
    const progressText = screen.getByTestId('progress-text-calendar-123');
    expect(progressText).toHaveTextContent('50% complete');
  });
  
  it('toggles between workflow and list view', () => {
    render(<MarketingPlanDashboard />);
    
    // Initially in workflow view
    const workflowButton = screen.getByText('Workflow View');
    expect(workflowButton.classList.contains('active')).toBe(true);
    
    // Click list view button
    fireEvent.click(screen.getByText('List View'));
    
    // Now in list view
    const listButton = screen.getByText('List View');
    expect(listButton.classList.contains('active')).toBe(true);
    expect(screen.getByText('Marketing Strategies')).toBeInTheDocument();
    expect(screen.getByText('Content Outlines')).toBeInTheDocument();
    expect(screen.getByText('Content Calendars')).toBeInTheDocument();
  });
  
  it('shows confirmation modal when deleting an entity', () => {
    // Mock strategies data
    useMarketingPlan.mockReturnValue({
      ...useMarketingPlan(),
      strategies: [
        {
          id: 'strategy-123',
          name: 'Test Strategy',
          created_at: '2023-01-01T00:00:00Z',
        },
      ],
      getOutlinesForStrategy: jest.fn(() => []),
      getCalendarsForStrategy: jest.fn(() => []),
    });
    
    render(<MarketingPlanDashboard />);
    
    // Find and click the delete button using data-testid
    const deleteButton = screen.getByTestId('delete-strategy-strategy-123');
    fireEvent.click(deleteButton);
    
    // Check that confirmation modal is shown
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this strategy/)).toBeInTheDocument();
  });
}); 