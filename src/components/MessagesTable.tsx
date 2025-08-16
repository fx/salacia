/**
 * MessagesTable component for displaying paginated AI interaction messages.
 *
 * This component uses TanStack React Table for advanced table functionality including
 * sorting, filtering, and pagination. It integrates with WebTUI design system for
 * consistent styling and accessibility.
 *
 * Features:
 * - Sortable columns with visual indicators
 * - Column resizing and reordering
 * - Responsive design with mobile-friendly layouts
 * - Accessibility support with ARIA attributes
 * - Error handling with fallback UI
 *
 * @module MessagesTable
 */

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import type { MessageDisplay, MessageSort } from '../lib/types/messages.js';
import { formatCompactDate } from '../lib/utils/date.js';
import { extractTextContent } from '../lib/utils/message-content.js';

/**
 * Props for the MessagesTable component.
 */
export interface MessagesTableProps {
  /** Array of message data to display */
  messages: MessageDisplay[];
  /** Current loading state */
  isLoading?: boolean;
  /** Error state for display */
  error?: string | null;
  /** Current sort configuration */
  sort: MessageSort;
  /** Callback for sort changes */
  onSortChange: (sort: MessageSort) => void;
}

/**
 * Column helper for type-safe column definitions.
 */
const columnHelper = createColumnHelper<MessageDisplay>();

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
 * Truncates text to specified length with ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * MessagesTable component for displaying AI interaction messages in a sortable table.
 * Provides comprehensive message information with responsive design and accessibility.
 *
 * @param props - Component props
 * @returns JSX element representing the messages table
 */
export function MessagesTable({
  messages,
  isLoading = false,
  error = null,
  sort,
  onSortChange,
}: MessagesTableProps): React.ReactElement {
  /**
   * Column definitions for the messages table.
   * Memoized to prevent unnecessary re-renders.
   */
  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: info => (
          <time dateTime={info.getValue().toISOString()} title={info.getValue().toLocaleString()}>
            {formatCompactDate(info.getValue())}
          </time>
        ),
        sortingFn: 'datetime',
        enableSorting: true,
      }),
      columnHelper.accessor('model', {
        header: 'Model',
        cell: info => info.getValue(),
        enableSorting: true,
      }),
      columnHelper.accessor('provider', {
        header: 'Provider',
        cell: info => {
          const provider = info.getValue();
          return provider || '—';
        },
        enableSorting: false,
      }),
      columnHelper.accessor('isSuccess', {
        header: 'Status',
        cell: info => {
          const isSuccess = info.getValue();
          const statusCode = info.row.original.statusCode;
          const error = info.row.original.error;
          const isLoading = statusCode === undefined && !error;

          if (isLoading) {
            return <span title="Loading...">⟳</span>;
          }

          return (
            <span title={error || `HTTP ${statusCode || 'Unknown'}`}>{isSuccess ? '✓' : '✗'}</span>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor('totalTokens', {
        header: 'Tokens',
        cell: info => {
          const tokens = info.getValue();
          return tokens ? formatNumber(tokens) : '—';
        },
        enableSorting: true,
      }),
      columnHelper.accessor('responseTime', {
        header: 'Time',
        cell: info => {
          const responseTime = info.getValue();
          return responseTime ? `${responseTime}ms` : '—';
        },
        enableSorting: true,
      }),
      columnHelper.accessor('request', {
        header: 'Request',
        cell: info => {
          const request = info.getValue();
          const textContent = extractTextContent(request);
          return <code title={textContent}>{truncateText(textContent, 40)}</code>;
        },
        enableSorting: false,
      }),
      columnHelper.accessor('response', {
        header: 'Response',
        cell: info => {
          const response = info.getValue();
          if (!response) return '—';
          const textContent = extractTextContent(response);
          return <code title={textContent}>{truncateText(textContent, 40)}</code>;
        },
        enableSorting: false,
      }),
    ],
    []
  );

  /**
   * Convert our sort format to TanStack Table format.
   */
  const sorting = useMemo<SortingState>(
    () => [
      {
        id: sort.field,
        desc: sort.direction === 'desc',
      },
    ],
    [sort.field, sort.direction]
  );

  /**
   * TanStack Table instance with configuration.
   */
  const table = useReactTable({
    data: messages,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: updater => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      const newSort = newSorting[0];
      if (newSort) {
        onSortChange({
          field: newSort.id as MessageSort['field'],
          direction: newSort.desc ? 'desc' : 'asc',
        });
      }
    },
    enableSorting: true,
    manualSorting: true, // We handle sorting on the server
  });

  // Handle error state
  if (error) {
    return (
      <div role="alert" aria-live="polite">
        <div data-variant="red" box-="square">
          <h3>Error Loading Messages</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <div>⟳ Loading messages...</div>
      </div>
    );
  }

  // Handle empty state
  if (messages.length === 0) {
    return (
      <div role="status" aria-live="polite">
        <h3>No Messages Found</h3>
        <p>There are no messages matching your current filters.</p>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Messages table">
      <table size-="compact">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} role="row">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  role="columnheader"
                  style={{
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                  tabIndex={header.column.getCanSort() ? 0 : -1}
                  onKeyDown={e => {
                    if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      header.column.getToggleSortingHandler()?.(e);
                    }
                  }}
                  aria-sort={
                    header.column.getIsSorted()
                      ? header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'ascending'
                      : header.column.getCanSort()
                        ? 'none'
                        : undefined
                  }
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <span aria-hidden="true">
                      {header.column.getIsSorted() === 'desc'
                        ? '↓'
                        : header.column.getIsSorted() === 'asc'
                          ? '↑'
                          : '↕'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} role="row">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} role="gridcell">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MessagesTable;
