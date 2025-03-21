// test-utils.js
import React from 'react';
import { render } from '@testing-library/react';

// Create mock for MarketingPlanContext
export const createMockMarketingPlanContext = (overrides = {}) => ({
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
  ...overrides
});

// Create mock for AuthContext
export const createMockAuthContext = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  loading: false,
  ...overrides
});

// Custom wrapper to provide all the necessary context providers
export function renderWithProviders(ui, {
  marketingPlanContext = createMockMarketingPlanContext(),
  authContext = createMockAuthContext(),
  router = {
    push: jest.fn(),
    pathname: '/marketing-plan',
    query: {},
    isReady: true,
  },
  ...renderOptions
} = {}) {
  // Mock context hooks
  jest.mock('../contexts/MarketingPlanContext', () => ({
    useMarketingPlan: () => marketingPlanContext,
    MarketingPlanContext: {
      Provider: ({ children }) => children,
      Consumer: ({ children }) => children(marketingPlanContext),
    },
  }));

  jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => authContext,
    AuthContext: {
      Provider: ({ children }) => children,
      Consumer: ({ children }) => children(authContext),
    },
  }));

  jest.mock('next/router', () => ({
    useRouter: () => router,
  }));

  // Return rendered UI
  return render(ui, { ...renderOptions });
} 