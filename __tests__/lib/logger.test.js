import logger, { debug, info, warn, error, createLogger } from '../../lib/logger';

describe('Logger', () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Mock console methods
  beforeEach(() => {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  // Restore original console methods
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('should export debug, info, warn, error, and createLogger functions', () => {
    expect(typeof debug).toBe('function');
    expect(typeof info).toBe('function');
    expect(typeof warn).toBe('function');
    expect(typeof error).toBe('function');
    expect(typeof createLogger).toBe('function');
  });

  it('should log messages with the correct level', () => {
    debug('Debug message');
    info('Info message');
    warn('Warning message');
    error('Error message');

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should include data in log messages when provided', () => {
    const testData = { key: 'value' };
    debug('Debug with data', testData);

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.debug.mock.calls[0][0]).toContain('Debug with data');
    expect(console.debug.mock.calls[0][0]).toContain(JSON.stringify(testData, null, 2));
  });

  it('should prefix logs with context when using createLogger', () => {
    const testLogger = createLogger('TestContext');
    testLogger.info('Contextual message');

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info.mock.calls[0][0]).toContain('[TestContext]');
    expect(console.info.mock.calls[0][0]).toContain('Contextual message');
  });
}); 