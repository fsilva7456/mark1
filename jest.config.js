// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Check if running in a CI environment (like Vercel)
const isCI = process.env.CI || process.env.NODE_ENV === 'test';

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (if you have them in your project)
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
  },
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.jsx'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*config.js',
    '!**/__tests__/**',
  ],
  // Verbose output for CI builds to show detailed test results
  verbose: isCI,
  // In CI, we want to generate JSON reports for easier parsing
  reporters: isCI 
    ? ['default', ['jest-junit', { outputDirectory: './test-results', outputName: 'junit.xml' }]]
    : ['default'],
  // Display individual test results with full diffs and proper error stacks
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // Increase test timeout in CI environments
  testTimeout: isCI ? 30000 : 5000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 