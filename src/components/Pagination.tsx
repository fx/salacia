/**
 * Pagination component for navigating through paginated data.
 * 
 * This component provides a complete pagination interface with WebTUI styling,
 * including page numbers, navigation controls, and accessibility features.
 * Supports large datasets with intelligent page range display.
 * 
 * Features:
 * - Smart page range calculation to avoid overwhelming UI
 * - Accessible navigation with ARIA labels and keyboard support
 * - Responsive design with mobile-friendly controls
 * - Previous/Next navigation with disabled state handling
 * - Jump to first/last page functionality
 * 
 * @module Pagination
 */

import React from 'react';
import { MESSAGES_CONSTANTS } from '../lib/types/messages.js';

/**
 * Props for the Pagination component.
 */
export interface PaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items per page */
  pageSize: number;
  /** Callback function called when page changes */
  onPageChange: (page: number) => void;
  /** Whether pagination is disabled (e.g., during loading) */
  disabled?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Calculates the range of page numbers to display in pagination.
 * Uses intelligent centering around current page with fallback to start/end.
 * 
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @returns Array of page numbers to display
 */
function calculatePageRange(currentPage: number, totalPages: number): number[] {
  const maxPages = MESSAGES_CONSTANTS.MAX_PAGINATION_PAGES;
  const offset = MESSAGES_CONSTANTS.PAGINATION_CENTER_OFFSET;

  // If total pages fit in max display, show all
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Calculate start and end of range
  let start = Math.max(1, currentPage - offset);
  let end = Math.min(totalPages, currentPage + offset);

  // Adjust if we're near the beginning
  if (start === 1) {
    end = Math.min(totalPages, maxPages);
  }

  // Adjust if we're near the end
  if (end === totalPages) {
    start = Math.max(1, totalPages - maxPages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Formats the current page info text for accessibility and user information.
 * 
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param totalItems - Total number of items
 * @param pageSize - Items per page
 * @returns Formatted info text
 */
function formatPageInfo(
  currentPage: number,
  totalPages: number,
  totalItems: number,
  pageSize: number
): string {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return `Showing ${startItem.toLocaleString()}-${endItem.toLocaleString()} of ${totalItems.toLocaleString()} results`;
}

/**
 * Pagination component providing navigation controls for paginated data.
 * Integrates with WebTUI design system and includes comprehensive accessibility features.
 * 
 * @param props - Component props
 * @returns JSX element representing the pagination controls
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  className = '',
}: PaginationProps): JSX.Element {
  const pageNumbers = calculatePageRange(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageInfo = formatPageInfo(currentPage, totalPages, totalItems, pageSize);

  // Don't render pagination if there's only one page or no items
  if (totalPages <= 1 || totalItems === 0) {
    return <div aria-live="polite" className="sr-only">{pageInfo}</div>;
  }

  /**
   * Handles page change with validation and disabled state checking.
   */
  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  /**
   * Handles keyboard navigation for pagination buttons.
   */
  const handleKeyDown = (event: React.KeyboardEvent, page: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePageChange(page);
    }
  };

  return (
    <nav
      className={`flex items-center justify-between gap-4 p-4 ${className}`}
      role="navigation"
      aria-label="Pagination navigation"
    >
      {/* Page info */}
      <div className="flex-1 text-sm text-gray-600" aria-live="polite">
        {pageInfo}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous page button */}
        <button
          className={`wui-button wui-button-secondary ${
            !hasPrevious || disabled ? 'wui-button-disabled opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage - 1)}
          disabled={!hasPrevious || disabled}
          aria-label="Go to previous page"
          title="Previous page"
          type="button"
        >
          ← Previous
        </button>

        {/* First page indicator */}
        {pageNumbers[0] > 1 && (
          <>
            <button
              className={`wui-button wui-button-outline ${
                disabled ? 'wui-button-disabled opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handlePageChange(1)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              disabled={disabled}
              aria-label="Go to first page"
              title="Go to page 1"
              type="button"
            >
              1
            </button>
            {pageNumbers[0] > 2 && (
              <span className="px-2 text-gray-400" aria-hidden="true">
                …
              </span>
            )}
          </>
        )}

        {/* Page number buttons */}
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            className={`wui-button ${
              pageNum === currentPage
                ? 'wui-button-primary'
                : 'wui-button-outline'
            } ${
              disabled ? 'wui-button-disabled opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => handlePageChange(pageNum)}
            onKeyDown={(e) => handleKeyDown(e, pageNum)}
            disabled={disabled}
            aria-label={
              pageNum === currentPage
                ? `Current page, page ${pageNum}`
                : `Go to page ${pageNum}`
            }
            aria-current={pageNum === currentPage ? 'page' : undefined}
            title={`Go to page ${pageNum}`}
            type="button"
          >
            {pageNum}
          </button>
        ))}

        {/* Last page indicator */}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-2 text-gray-400" aria-hidden="true">
                …
              </span>
            )}
            <button
              className={`wui-button wui-button-outline ${
                disabled ? 'wui-button-disabled opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handlePageChange(totalPages)}
              onKeyDown={(e) => handleKeyDown(e, totalPages)}
              disabled={disabled}
              aria-label="Go to last page"
              title={`Go to page ${totalPages}`}
              type="button"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next page button */}
        <button
          className={`wui-button wui-button-secondary ${
            !hasNext || disabled ? 'wui-button-disabled opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage + 1)}
          disabled={!hasNext || disabled}
          aria-label="Go to next page"
          title="Next page"
          type="button"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}

export default Pagination;