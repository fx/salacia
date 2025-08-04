import { describe, it, expect } from 'vitest';

// Test utilities for modal functionality
class ModalUtils {
  /**
   * Format JSON data for display
   */
  static formatJson(data: any): string {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    try {
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return data;
        }
      } else {
        return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Format tokens display for modal
   */
  static formatTokens(messageData: any): string {
    const parts = [];
    
    if (messageData.inputTokens) {
      parts.push(`Input: ${messageData.inputTokens}`);
    }
    if (messageData.outputTokens) {
      parts.push(`Output: ${messageData.outputTokens}`);
    }
    if (messageData.totalTokens) {
      parts.push(`Total: ${messageData.totalTokens}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  /**
   * Determine if message is in flight
   */
  static isMessageInFlight(messageData: any, inFlightMessages: Set<string>): boolean {
    return inFlightMessages.has(messageData.id) || 
           messageData.status === 'in-flight' ||
           !messageData.responseTime;
  }

  /**
   * Get status display info
   */
  static getStatusDisplay(messageData: any, inFlightMessages: Set<string>): { text: string, class: string } {
    const isInFlight = this.isMessageInFlight(messageData, inFlightMessages);
    
    if (isInFlight) {
      return { text: 'Processing', class: 'webtui-status webtui-status--warning' };
    } else if (messageData.isSuccess) {
      return { text: 'Success', class: 'webtui-status webtui-status--success' };
    } else {
      return { text: 'Error', class: 'webtui-status webtui-status--error' };
    }
  }
}

describe('Modal Functionality Utils', () => {
  describe('JSON Formatting', () => {
    it('should format JSON data correctly', () => {
      const testData = { message: 'test', nested: { value: 123 } };
      const result = ModalUtils.formatJson(testData);
      
      expect(result).toBe(JSON.stringify(testData, null, 2));
    });

    it('should handle JSON strings', () => {
      const jsonString = '{"test": "value"}';
      const result = ModalUtils.formatJson(jsonString);
      
      expect(result).toBe(JSON.stringify({ test: 'value' }, null, 2));
    });

    it('should handle invalid JSON strings', () => {
      const invalidJson = 'not json';
      const result = ModalUtils.formatJson(invalidJson);
      
      expect(result).toBe('not json');
    });

    it('should handle null and undefined', () => {
      expect(ModalUtils.formatJson(null)).toBe('null');
      expect(ModalUtils.formatJson(undefined)).toBe('null');
    });
  });

  describe('Token Formatting', () => {
    it('should format tokens correctly', () => {
      const messageData = {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150
      };
      
      const result = ModalUtils.formatTokens(messageData);
      expect(result).toBe('Input: 100, Output: 50, Total: 150');
    });

    it('should handle missing token data', () => {
      const messageData = {};
      const result = ModalUtils.formatTokens(messageData);
      expect(result).toBe('N/A');
    });

    it('should handle partial token data', () => {
      const messageData = { totalTokens: 100 };
      const result = ModalUtils.formatTokens(messageData);
      expect(result).toBe('Total: 100');
    });
  });

  describe('Status Detection', () => {
    it('should detect in-flight messages', () => {
      const inFlightMessages = new Set(['in-flight-id']);
      
      const messageData1 = { id: 'in-flight-id', responseTime: null };
      expect(ModalUtils.isMessageInFlight(messageData1, inFlightMessages)).toBe(true);
      
      const messageData2 = { id: 'other-id', status: 'in-flight' };
      expect(ModalUtils.isMessageInFlight(messageData2, inFlightMessages)).toBe(true);
      
      const messageData3 = { id: 'other-id', responseTime: null };
      expect(ModalUtils.isMessageInFlight(messageData3, inFlightMessages)).toBe(true);
    });

    it('should detect completed messages', () => {
      const inFlightMessages = new Set<string>();
      
      const messageData = { id: 'completed-id', responseTime: 250, isSuccess: true };
      expect(ModalUtils.isMessageInFlight(messageData, inFlightMessages)).toBe(false);
    });

    it('should return correct status display', () => {
      const inFlightMessages = new Set(['in-flight-id']);
      
      // In-flight message
      const inFlightMessage = { id: 'in-flight-id', responseTime: null };
      const inFlightStatus = ModalUtils.getStatusDisplay(inFlightMessage, inFlightMessages);
      expect(inFlightStatus.text).toBe('Processing');
      expect(inFlightStatus.class).toBe('webtui-status webtui-status--warning');
      
      // Success message
      const successMessage = { id: 'success-id', responseTime: 250, isSuccess: true };
      const successStatus = ModalUtils.getStatusDisplay(successMessage, inFlightMessages);
      expect(successStatus.text).toBe('Success');
      expect(successStatus.class).toBe('webtui-status webtui-status--success');
      
      // Error message
      const errorMessage = { id: 'error-id', responseTime: 250, isSuccess: false };
      const errorStatus = ModalUtils.getStatusDisplay(errorMessage, inFlightMessages);
      expect(errorStatus.text).toBe('Error');
      expect(errorStatus.class).toBe('webtui-status webtui-status--error');
    });
  });
});