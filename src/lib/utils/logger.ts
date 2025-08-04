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

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

const LOG_LEVEL_NAMES: Record<string, LogLevelType> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

/**
 * Get current log level from environment
 */
function getCurrentLogLevel(): LogLevelType {
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
      if (error && typeof error === 'object') {
        // For errors, preserve stack traces if available
        const errorInfo =
          error instanceof Error ? error.stack || error.message : JSON.stringify(error);
        console.error(`[${this.context}] ${message}`, errorInfo);
      } else {
        console.error(`[${this.context}] ${message}`, error || '');
      }
    }
  }

  warn(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.WARN) {
      if (data && typeof data === 'object') {
        console.warn(`[${this.context}] ${message}`, JSON.stringify(data));
      } else {
        console.warn(`[${this.context}] ${message}`, data || '');
      }
    }
  }

  info(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.INFO) {
      if (data && typeof data === 'object') {
        // eslint-disable-next-line no-console
        console.info(`[${this.context}] ${message}`, JSON.stringify(data));
      } else {
        // eslint-disable-next-line no-console
        console.info(`[${this.context}] ${message}`, data || '');
      }
    }
  }

  debug(message: string, data?: unknown): void {
    if (currentLogLevel >= LogLevel.DEBUG) {
      if (data && typeof data === 'object') {
        // Stringify objects to keep logs concise on a single line
        // eslint-disable-next-line no-console
        console.debug(`[${this.context}] ${message}`, JSON.stringify(data));
      } else {
        // eslint-disable-next-line no-console
        console.debug(`[${this.context}] ${message}`, data || '');
      }
    }
  }
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
