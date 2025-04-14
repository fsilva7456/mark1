// jest.setup.js
// Set test environment variables first
process.env.NODE_ENV = 'test';

// Import jest-dom using require
require('@testing-library/jest-dom');

// Mock console methods for testing
global.console = {
  ...console,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Set up Jest mocks
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
  }),
}));

// Mock next/image without JSX syntax
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image(props) {
    // Return a plain object instead of JSX
    return {
      type: 'img',
      props: { ...props },
    };
  },
}));

// Mock next/head without JSX syntax
jest.mock('next/head', () => ({
  __esModule: true,
  default: function Head({ children }) {
    // Return a plain object instead of JSX
    return {
      type: 'head',
      props: { children },
    };
  },
}));

// Mock next/link without JSX syntax  
jest.mock('next/link', () => ({
  __esModule: true,
  default: function Link({ children, href }) {
    // Return a plain object instead of JSX
    return {
      type: 'a',
      props: { href, children },
    };
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: function Toaster() {
    return null;
  },
}));

// Mock the Drag and Drop functionality
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()],
  DndProvider: ({ children }) => children,
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: 'HTML5Backend',
}));

// Override console.error to suppress certain React warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: React.createElement') ||
      args[0].includes('Warning: Each child in a list'))
  ) {
    return;
  }
  originalConsoleError(...args);
}; 