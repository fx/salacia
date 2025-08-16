/**
 * Test suite for MessageDetailDialog component.
 * Tests dialog functionality, JSON rendering, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageDetailDialog } from './MessageDetailDialog';
import type { MessageDisplay } from '../lib/types/messages';

/**
 * Mock message data for testing.
 */
const mockMessage: MessageDisplay = {
  id: 'test-id',
  model: 'gpt-4',
  provider: 'OpenAI',
  createdAt: new Date('2025-01-01T12:00:00Z'),
  responseTime: 1500,
  totalTokens: 100,
  promptTokens: 50,
  completionTokens: 50,
  statusCode: 200,
  error: undefined,
  requestPreview: 'Test request',
  responsePreview: 'Test response',
  isSuccess: true,
  request: { messages: [{ role: 'user', content: 'Hello' }] },
  response: { choices: [{ message: { content: 'Hi there!' } }] },
};

/**
 * Mock clipboard API for testing copy functionality.
 */
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('MessageDetailDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    message: mockMessage,
  };

  it('renders when open with message data', () => {
    render(<MessageDetailDialog {...defaultProps} />);
    
    expect(screen.getByText('Message Details')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MessageDetailDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Message Details')).not.toBeInTheDocument();
  });

  it('does not render when message is null', () => {
    render(<MessageDetailDialog {...defaultProps} message={null} />);
    
    expect(screen.queryByText('Message Details')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MessageDetailDialog {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('displays success status correctly', () => {
    render(<MessageDetailDialog {...defaultProps} />);
    
    expect(screen.getByText('✓ Success')).toBeInTheDocument();
  });

  it('displays failed status for unsuccessful messages', () => {
    const failedMessage = {
      ...mockMessage,
      isSuccess: false,
      error: 'Test error',
    };
    
    render(<MessageDetailDialog {...defaultProps} message={failedMessage} />);
    
    expect(screen.getByText('✗ Failed')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows response data section when response exists', () => {
    render(<MessageDetailDialog {...defaultProps} />);
    
    expect(screen.getByText('Response Data')).toBeInTheDocument();
  });

  it('shows no response message when response is missing', () => {
    const messageWithoutResponse = {
      ...mockMessage,
      response: undefined,
    };
    
    render(<MessageDetailDialog {...defaultProps} message={messageWithoutResponse} />);
    
    expect(screen.getByText('No response data available')).toBeInTheDocument();
  });

  it('handles copy to clipboard for request data', async () => {
    render(<MessageDetailDialog {...defaultProps} />);
    
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]); // Request copy button
    
    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify(mockMessage.request, null, 2)
    );
  });

  it('formats numbers with proper separators', () => {
    const messageWithLargeTokens = {
      ...mockMessage,
      totalTokens: 1234567,
    };
    
    render(<MessageDetailDialog {...defaultProps} message={messageWithLargeTokens} />);
    
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});