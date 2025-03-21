// test-utils.js
import React from 'react';
import { render } from '@testing-library/react';

// Create mock for AuthContext
const createAuthContextValue = (overrides = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  loading: false,
  ...overrides
});

// Create mock for MarketingPlanContext
const createMarketingPlanContextValue = (overrides = {}) => ({
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

// Mock context modules at the top level
jest.mock('../contexts/AuthContext', () => {
  // Store the context value here so it can be updated in tests
  let mockAuthContext = createAuthContextValue();
  
  return {
    useAuth: () => mockAuthContext,
    setMockAuthContext: (newValue) => {
      mockAuthContext = { ...mockAuthContext, ...newValue };
    },
    AuthContext: {
      Provider: ({ children }) => children,
    }
  };
});

jest.mock('../contexts/MarketingPlanContext', () => {
  // Store the context value here so it can be updated in tests
  let mockMarketingPlanContext = createMarketingPlanContextValue();
  
  return {
    useMarketingPlan: () => mockMarketingPlanContext,
    setMockMarketingPlanContext: (newValue) => {
      mockMarketingPlanContext = { ...mockMarketingPlanContext, ...newValue };
    },
    MarketingPlanContext: {
      Provider: ({ children }) => children,
    }
  };
});

// Custom render that wraps with all providers
function renderWithContext(ui, {
  authContext,
  marketingPlanContext,
  routerProps = {},
  ...renderOptions
} = {}) {
  // Set context values based on provided props
  if (authContext) {
    const { setMockAuthContext } = require('../contexts/AuthContext');
    setMockAuthContext(authContext);
  }
  
  if (marketingPlanContext) {
    const { setMockMarketingPlanContext } = require('../contexts/MarketingPlanContext');
    setMockMarketingPlanContext(marketingPlanContext);
  }
  
  // Mock router
  const mockRouter = {
    pathname: '/marketing-plan',
    query: {},
    isReady: true,
    push: jest.fn(),
    replace: jest.fn(),
    ...routerProps
  };
  
  jest.mock('next/router', () => ({
    useRouter: () => mockRouter
  }));
  
  // Return rendered component
  return render(ui, { ...renderOptions });
}

export {
  createAuthContextValue,
  createMarketingPlanContextValue,
  renderWithContext
}; 