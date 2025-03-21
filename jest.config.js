// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Load setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Use jsdom environment
  testEnvironment: 'jest-environment-jsdom',
  // Handle paths and module aliases
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
  },
  // Identify test files
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.jsx'],
  // Exclude certain directories from testing
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // Set reasonable test timeout
  testTimeout: 10000,
  // Set environment variables
  globals: {
    'process.env.NODE_ENV': 'test',
  },
  // Be verbose
  verbose: true,
  // Handle ESM modules
  transformIgnorePatterns: [
    '/node_modules/(?!react-dnd|react-dnd-html5-backend|dnd-core)/'
  ],
};

// Export the config
module.exports = createJestConfig(customJestConfig); 