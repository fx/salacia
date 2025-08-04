import { describe, it, expect } from 'vitest';

// Test utilities for error handling and retry logic
class ErrorHandlingUtils {
  /**
   * Get user-friendly error message based on error type
   */
  static getUserFriendlyErrorMessage(error: any): string {
    if (error.name === 'AbortError') {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    
    if (error.message.includes('HTTP 404')) {
      return 'The requested data was not found.';
    }
    
    if (error.message.includes('HTTP 403')) {
      return 'You do not have permission to access this data.';
    }
    
    if (error.message.includes('HTTP 500')) {
      return 'Server error occurred. Please try again later.';
    }
    
    if (error.message.includes('HTTP 502') || error.message.includes('HTTP 503')) {
      return 'Service temporarily unavailable. Please try again in a few moments.';
    }
    
    // Default fallback
    return `An error occurred: ${error.message}`;
  }

  /**
   * Determine if an error should be retried
   */
  static shouldRetryError(error: any, retryCount: number, maxRetries: number): boolean {
    if (retryCount >= maxRetries) {
      return false;
    }

    // Retry on network errors and server errors
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      error.message.includes('Server error') ||
      error.message.includes('HTTP 5')
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  static calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
    return baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Validate API response status
   */
  static validateResponse(response: any): { shouldRetry: boolean; isClientError: boolean } {
    if (!response.ok) {
      const status = response.status;
      
      // Client errors (4xx) - don't retry
      if (status >= 400 && status < 500) {
        return { shouldRetry: false, isClientError: true };
      }
      
      // Server errors (5xx) - retry
      if (status >= 500) {
        return { shouldRetry: true, isClientError: false };
      }
    }
    
    return { shouldRetry: false, isClientError: false };
  }

  /**
   * Check if browser is online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Format error for logging
   */
  static formatErrorForLogging(error: any, context: string): any {
    return {
      context,
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      online: navigator.onLine
    };
  }
}

describe('Error Handling and Retry Logic', () => {
  describe('User-Friendly Error Messages', () => {
    it('should handle timeout errors', () => {
      const error = { name: 'AbortError', message: 'Request aborted' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('Request timed out. Please check your connection and try again.');
    });

    it('should handle network errors', () => {
      const error = { name: 'TypeError', message: 'Failed to fetch' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('Unable to connect to the server. Please check your network connection.');
    });

    it('should handle 404 errors', () => {
      const error = { message: 'HTTP 404: Not Found' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('The requested data was not found.');
    });

    it('should handle 403 errors', () => {
      const error = { message: 'HTTP 403: Forbidden' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('You do not have permission to access this data.');
    });

    it('should handle 500 errors', () => {
      const error = { message: 'HTTP 500: Internal Server Error' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('Server error occurred. Please try again later.');
    });

    it('should handle 502/503 errors', () => {
      const error502 = { message: 'HTTP 502: Bad Gateway' };
      const error503 = { message: 'HTTP 503: Service Unavailable' };
      
      expect(ErrorHandlingUtils.getUserFriendlyErrorMessage(error502))
        .toBe('Service temporarily unavailable. Please try again in a few moments.');
      expect(ErrorHandlingUtils.getUserFriendlyErrorMessage(error503))
        .toBe('Service temporarily unavailable. Please try again in a few moments.');
    });

    it('should handle unknown errors', () => {
      const error = { message: 'Something went wrong' };
      const result = ErrorHandlingUtils.getUserFriendlyErrorMessage(error);
      expect(result).toBe('An error occurred: Something went wrong');
    });
  });

  describe('Retry Logic', () => {
    it('should retry network errors', () => {
      const error = { name: 'TypeError', message: 'Failed to fetch' };
      expect(ErrorHandlingUtils.shouldRetryError(error, 0, 3)).toBe(true);
      expect(ErrorHandlingUtils.shouldRetryError(error, 2, 3)).toBe(true);
      expect(ErrorHandlingUtils.shouldRetryError(error, 3, 3)).toBe(false);
    });

    it('should retry timeout errors', () => {
      const error = { name: 'AbortError', message: 'Request aborted' };
      expect(ErrorHandlingUtils.shouldRetryError(error, 0, 3)).toBe(true);
    });

    it('should retry server errors', () => {
      const error = { message: 'Server error: 500' };
      expect(ErrorHandlingUtils.shouldRetryError(error, 0, 3)).toBe(true);
    });

    it('should not retry client errors', () => {
      const error = { message: 'HTTP 404: Not Found' };
      expect(ErrorHandlingUtils.shouldRetryError(error, 0, 3)).toBe(false);
    });

    it('should not exceed max retries', () => {
      const error = { name: 'TypeError', message: 'Failed to fetch' };
      expect(ErrorHandlingUtils.shouldRetryError(error, 3, 3)).toBe(false);
      expect(ErrorHandlingUtils.shouldRetryError(error, 5, 3)).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct delays', () => {
      expect(ErrorHandlingUtils.calculateRetryDelay(0, 1000)).toBe(1000); // 1s
      expect(ErrorHandlingUtils.calculateRetryDelay(1, 1000)).toBe(2000); // 2s
      expect(ErrorHandlingUtils.calculateRetryDelay(2, 1000)).toBe(4000); // 4s
      expect(ErrorHandlingUtils.calculateRetryDelay(3, 1000)).toBe(8000); // 8s
    });

    it('should handle custom base delays', () => {
      expect(ErrorHandlingUtils.calculateRetryDelay(0, 500)).toBe(500);
      expect(ErrorHandlingUtils.calculateRetryDelay(1, 500)).toBe(1000);
      expect(ErrorHandlingUtils.calculateRetryDelay(2, 500)).toBe(2000);
    });
  });

  describe('Response Validation', () => {
    it('should identify client errors', () => {
      const response404 = { ok: false, status: 404 };
      const response403 = { ok: false, status: 403 };
      
      expect(ErrorHandlingUtils.validateResponse(response404))
        .toEqual({ shouldRetry: false, isClientError: true });
      expect(ErrorHandlingUtils.validateResponse(response403))
        .toEqual({ shouldRetry: false, isClientError: true });
    });

    it('should identify server errors for retry', () => {
      const response500 = { ok: false, status: 500 };
      const response502 = { ok: false, status: 502 };
      
      expect(ErrorHandlingUtils.validateResponse(response500))
        .toEqual({ shouldRetry: true, isClientError: false });
      expect(ErrorHandlingUtils.validateResponse(response502))
        .toEqual({ shouldRetry: true, isClientError: false });
    });

    it('should handle successful responses', () => {
      const response200 = { ok: true, status: 200 };
      
      expect(ErrorHandlingUtils.validateResponse(response200))
        .toEqual({ shouldRetry: false, isClientError: false });
    });
  });

  describe('Connection Status', () => {
    it('should detect online status', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      expect(ErrorHandlingUtils.isOnline()).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      expect(ErrorHandlingUtils.isOnline()).toBe(false);
    });
  });

  describe('Error Logging', () => {
    it('should format errors for logging', () => {
      const error = new Error('Test error');
      error.name = 'TestError';
      
      const formatted = ErrorHandlingUtils.formatErrorForLogging(error, 'test-context');
      
      expect(formatted).toMatchObject({
        context: 'test-context',
        message: 'Test error',
        name: 'TestError',
        online: expect.any(Boolean),
        timestamp: expect.any(String)
      });
      expect(formatted.stack).toBeDefined();
    });

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');
      const formatted = ErrorHandlingUtils.formatErrorForLogging(error, 'test');
      
      expect(new Date(formatted.timestamp).toISOString()).toBe(formatted.timestamp);
    });
  });
});