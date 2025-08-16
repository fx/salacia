/**
 * MessageDetailDialog component for displaying detailed message data.
 *
 * This component provides a modal dialog for viewing the complete data
 * of a message interaction, including formatted JSON views of request
 * and response data. Uses react-json-view-lite for syntax highlighting
 * and proper JSON formatting.
 *
 * Features:
 * - Full message metadata display
 * - JSON viewer with syntax highlighting
 * - Expandable/collapsible sections
 * - Copy to clipboard functionality
 * - Accessible modal with proper focus management
 * - WebTUI styling and dialog positioning
 *
 * @module MessageDetailDialog
 */

import React, { useRef, useEffect } from 'react';
import { JsonView, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import type { MessageDisplay } from '../lib/types/messages.js';
import { formatCompactDate } from '../lib/utils/date.js';

/**
 * Props for the MessageDetailDialog component.
 */
export interface MessageDetailDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Message data to display */
  message: MessageDisplay | null;
}

/**
 * Formats a number with proper thousands separators.
 *
 * @param num - Number to format
 * @returns Formatted number string
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * MessageDetailDialog component providing a modal interface for viewing
 * complete message data with JSON formatting and syntax highlighting.
 *
 * @param props - Component props
 * @returns JSX element representing the message detail dialog
 */
export function MessageDetailDialog({
  isOpen,
  onClose,
  message,
}: MessageDetailDialogProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);

  /**
   * Helper function to render JSON data safely.
   */
  const renderJsonData = (data: unknown): React.ReactNode => {
    if (!data || typeof data !== 'object' || data === null) {
      return null;
    }
    return (
      <JsonView
        data={data as Record<string, unknown>}
        shouldExpandNode={(level: number) => level < 3}
        style={darkStyles}
      />
    );
  };

  /**
   * Handle dialog open/close based on isOpen prop.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  /**
   * Handle dialog close events (including ESC key and backdrop clicks).
   */
  const handleDialogClose = () => {
    onClose();
  };

  /**
   * Handle backdrop clicks to close dialog.
   */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (!isInDialog) {
      handleDialogClose();
    }
  };

  /**
   * Copy JSON data to clipboard.
   */
  const copyToClipboard = async (data: unknown, label: string) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      // Note: In a real app, you might want to show a toast notification here
    } catch (error) {
      console.error(`Failed to copy ${label} to clipboard:`, error);
    }
  };

  if (!message || !isOpen) {
    return null;
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={handleDialogClose}
        onClick={handleBackdropClick}
        position-="center"
        size-="default"
        box-="square"
        className="message-detail-dialog"
        style={{
          width: '80vw',
          height: '80vh',
          maxWidth: '1200px',
          maxHeight: '800px',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ height: '100%', overflow: 'auto', padding: '1rem' }}
        >
          <h2>Message Details</h2>

          {/* Metadata Section */}
          <div box-="square" style={{ marginBottom: '1rem' }}>
            <h3>Metadata</h3>
            <dl>
              <dt>
                <strong>ID</strong>
              </dt>
              <dd>{message.id}</dd>

              <dt>
                <strong>Created</strong>
              </dt>
              <dd>
                <time dateTime={message.createdAt.toISOString()}>
                  {message.createdAt.toLocaleString()}
                </time>{' '}
                <small>({formatCompactDate(message.createdAt)})</small>
              </dd>

              <dt>
                <strong>Model</strong>
              </dt>
              <dd>{message.model}</dd>

              {message.provider && (
                <>
                  <dt>
                    <strong>Provider</strong>
                  </dt>
                  <dd>{message.provider}</dd>
                </>
              )}

              <dt>
                <strong>Status</strong>
              </dt>
              <dd>
                <span title={message.error || `HTTP ${message.statusCode || 'Unknown'}`}>
                  {message.isSuccess ? (
                    <span style={{ color: 'var(--green)' }}>✓ Success</span>
                  ) : (
                    <span style={{ color: 'var(--red)' }}>✗ Failed</span>
                  )}
                </span>
                {message.statusCode && ` (${message.statusCode})`}
              </dd>

              {message.responseTime && (
                <>
                  <dt>
                    <strong>Response Time</strong>
                  </dt>
                  <dd>{message.responseTime}ms</dd>
                </>
              )}

              {message.totalTokens && (
                <>
                  <dt>
                    <strong>Total Tokens</strong>
                  </dt>
                  <dd>{formatNumber(message.totalTokens)}</dd>
                </>
              )}

              {message.promptTokens && (
                <>
                  <dt>
                    <strong>Prompt Tokens</strong>
                  </dt>
                  <dd>{formatNumber(message.promptTokens)}</dd>
                </>
              )}

              {message.completionTokens && (
                <>
                  <dt>
                    <strong>Completion Tokens</strong>
                  </dt>
                  <dd>{formatNumber(message.completionTokens)}</dd>
                </>
              )}

              {message.error && (
                <>
                  <dt>
                    <strong>Error</strong>
                  </dt>
                  <dd style={{ color: 'var(--red)' }}>{message.error}</dd>
                </>
              )}
            </dl>
          </div>

          <div box-="square" style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <h3>Request Data</h3>
              <button
                is-="button"
                size-="small"
                onClick={() => copyToClipboard(message.request, 'request')}
              >
                Copy
              </button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '400px' }}>
              {renderJsonData(message.request)}
            </div>
          </div>

          {/* Response Data Section */}
          {message.response ? (
            <div box-="square" style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <h3>Response Data</h3>
                <button
                  is-="button"
                  size-="small"
                  onClick={() => copyToClipboard(message.response, 'response')}
                >
                  Copy
                </button>
              </div>
              <div style={{ overflow: 'auto', maxHeight: '400px' }}>
                {renderJsonData(message.response)}
              </div>
            </div>
          ) : null}

          {!message.response && (
            <div box-="square" variant-="muted" style={{ marginBottom: '1rem' }}>
              <h3>Response Data</h3>
              <p>No response data available</p>
            </div>
          )}

          {/* Dialog Actions */}
          <div style={{ textAlign: 'right' }}>
            <button is-="button" onClick={handleDialogClose}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export default MessageDetailDialog;
