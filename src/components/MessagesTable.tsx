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
  /** Optional CSS class name */
  className?: string;
}

/**
 * Column helper for type-safe column definitions.
 */
const columnHelper = createColumnHelper<MessageDisplay>();

/**
 * Formats a date to a human-readable string.
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
  className = '',
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
          <time dateTime={info.getValue().toISOString()} title={formatDate(info.getValue())}>
            <small>{formatDate(info.getValue())}</small>
          </time>
        ),
        sortingFn: 'datetime',
        enableSorting: true,
      }),
      columnHelper.accessor('model', {
        header: 'Model',
        cell: info => <strong title={info.getValue()}>{info.getValue()}</strong>,
        enableSorting: true,
      }),
      columnHelper.accessor('provider', {
        header: 'Provider',
        cell: info => {
          const provider = info.getValue();
          return provider ? <small title={provider}>{provider}</small> : <small>—</small>;
        },
        enableSorting: false,
      }),
      columnHelper.accessor('isSuccess', {
        header: 'Status',
        cell: info => {
          const isSuccess = info.getValue();
          const statusCode = info.row.original.statusCode;
          const error = info.row.original.error;

          return (
            <span>
              <span
                is-="badge"
                variant-={isSuccess ? 'success' : 'error'}
                title={error || `HTTP ${statusCode}`}
              >
                <small>{isSuccess ? '✓ Success' : '✗ Failed'}</small>
              </span>
              {statusCode && <small title={`HTTP Status: ${statusCode}`}>{statusCode}</small>}
            </span>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor('totalTokens', {
        header: 'Tokens',
        cell: info => {
          const tokens = info.getValue();
          return tokens ? (
            <small title={`Total tokens: ${formatNumber(tokens)}`}>{formatNumber(tokens)}</small>
          ) : (
            <small>—</small>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('responseTime', {
        header: 'Response Time',
        cell: info => {
          const responseTime = info.getValue();
          return responseTime ? (
            <small title={`Response time: ${responseTime}ms`}>{responseTime}ms</small>
          ) : (
            <small>—</small>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('requestPreview', {
        header: 'Request Preview',
        cell: info => <code title={info.getValue()}>{truncateText(info.getValue(), 40)}</code>,
        enableSorting: false,
      }),
      columnHelper.accessor('responsePreview', {
        header: 'Response Preview',
        cell: info => {
          const preview = info.getValue();
          return preview ? (
            <code title={preview}>{truncateText(preview, 40)}</code>
          ) : (
            <small>—</small>
          );
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
        <div variant-="error" box-="square" style={{ textAlign: 'center' }}>
          <h3>Error Loading Messages</h3>
          <p>
            <small>{error}</small>
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <div style={{ textAlign: 'center' }}>
          <div>⟳</div>
          <p>
            <small>Loading messages...</small>
          </p>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (messages.length === 0) {
    return (
      <div role="status" aria-live="polite">
        <div style={{ textAlign: 'center' }}>
          <h3>No Messages Found</h3>
          <p>
            <small>There are no messages matching your current filters.</small>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Messages table">
      <table is-="table" role="table" style={{ width: '100%' }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} role="row">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  role="columnheader"
                  style={{
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1ch' }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span aria-hidden="true">
                        <small>
                          {header.column.getIsSorted() === 'desc'
                            ? '↓'
                            : header.column.getIsSorted() === 'asc'
                              ? '↑'
                              : '↕'}
                        </small>
                      </span>
                    )}
                  </div>
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
