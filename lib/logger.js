/**
 * Logger utility for consistent application logging
 * Provides log levels with timestamps and formatting
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Check if we're in production environment
const isProd = process.env.NODE_ENV === 'production';

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, message, data) => {
  const timestamp = new Date().toISOString();
  const dataString = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataString}`;
};

/**
 * Log a message to the console
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
const log = (level, message, data) => {
  // Skip debug logs in production
  if (isProd && level === LOG_LEVELS.DEBUG) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, data);

  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.debug(formattedMessage);
      break;
    case LOG_LEVELS.INFO:
      console.info(formattedMessage);
      break;
    case LOG_LEVELS.WARN:
      console.warn(formattedMessage);
      break;
    case LOG_LEVELS.ERROR:
      console.error(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
};

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
export const debug = (message, data) => {
  log(LOG_LEVELS.DEBUG, message, data);
};

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
export const info = (message, data) => {
  log(LOG_LEVELS.INFO, message, data);
};

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
export const warn = (message, data) => {
  log(LOG_LEVELS.WARN, message, data);
};

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {object} data - Optional data to include
 */
export const error = (message, data) => {
  log(LOG_LEVELS.ERROR, message, data);
};

/**
 * Create a logger instance with a specific context
 * @param {string} context - Context name for this logger
 * @returns {object} Logger instance with context
 */
export const createLogger = (context) => {
  return {
    debug: (message, data) => debug(`[${context}] ${message}`, data),
    info: (message, data) => info(`[${context}] ${message}`, data),
    warn: (message, data) => warn(`[${context}] ${message}`, data),
    error: (message, data) => error(`[${context}] ${message}`, data),
  };
};

// Default export
const logger = {
  debug,
  info,
  warn,
  error,
  createLogger,
};

export default logger; 