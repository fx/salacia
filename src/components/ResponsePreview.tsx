/**
 * ResponsePreview component for displaying response previews with stop reason icons
 *
 * This component renders response content with optional stop reason indicators,
 * providing hover tooltips to explain why the response stopped.
 */

import React from 'react';
import type { PreviewResult } from '../lib/utils/content-preview.js';

/**
 * Props for the ResponsePreview component
 */
export interface ResponsePreviewProps {
  /** The response preview result with optional stop reason metadata */
  preview?: PreviewResult;
  /** Fallback text to display if no preview is available */
  fallback?: string;
  /** Maximum number of characters to display before truncation */
  maxLength?: number;
}

/**
 * Truncates text to a specified length, adding ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * ResponsePreview component that displays response text with optional stop reason icons
 */
export function ResponsePreview({
  preview,
  fallback = '—',
  maxLength = 40,
}: ResponsePreviewProps): React.JSX.Element {
  // Handle case where no preview is available
  if (!preview) {
    return <span>{fallback}</span>;
  }

  const truncatedText = truncateText(preview.text, maxLength);

  // If there's no stop reason and no topic info, just show the text
  if (!preview.stopReason && !preview.topicInfo) {
    return <code title={preview.text}>{truncatedText}</code>;
  }

  // Show icons at the beginning, followed by text
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25ch' }}>
      {preview.topicInfo && (
        <span
          title={`${preview.topicInfo.isNewTopic ? 'New topic' : 'Continuing topic'}: ${preview.topicInfo.title}`}
          style={{
            fontSize: '0.9em',
            cursor: 'help',
            opacity: 0.8,
          }}
          aria-label={`${preview.topicInfo.isNewTopic ? 'New topic' : 'Continuing topic'}: ${preview.topicInfo.title}`}
        >
          {preview.topicInfo.icon}
        </span>
      )}
      {preview.stopReason && (
        <span
          title={preview.stopReason.tooltip}
          style={{
            fontSize: '0.9em',
            cursor: 'help',
            opacity: 0.8,
          }}
          aria-label={preview.stopReason.tooltip}
        >
          {preview.stopReason.icon}
        </span>
      )}
      <code title={preview.text}>{truncatedText}</code>
    </span>
  );
}

export default ResponsePreview;
