/**
 * Centralized logging utility with verbosity control
 * 
 * Log levels:
 * - ERROR: Always shown (critical errors)
 * - WARN: Shown in production (warnings)
 * - INFO: Default level (important information)
 * - DEBUG: Development debugging (verbose)
 * 
 * Control via LOG_LEVEL environment variable
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const LOG_LEVEL_NAMES: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

/**
 * Get current log level from environment
 */
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  
  // Default to INFO in production, DEBUG in development
  if (!envLevel) {
    return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
  
  return LOG_LEVEL_NAMES[envLevel] ?? LogLevel.INFO;
}

const currentLogLevel = getCurrentLogLevel();

/**
 * Logger class with controlled verbosity
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  error(message: string, error?: unknown): void {
    if (currentLogLevel >= LogLevel.ERROR) {
      console.error(`[${this.context}] ${message}`, error || '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(`[${this.context}] ${message}`, data || '');
    }
  }

  info(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.INFO) {
      console.info(`[${this.context}] ${message}`, data || '');
    }
  }

  debug(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.debug(`[${this.context}] ${message}`, data || '');
    }
  }
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}