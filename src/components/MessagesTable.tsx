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

import React, { useMemo, type JSX } from 'react';
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
}: MessagesTableProps): JSX.Element {
  /**
   * Column definitions for the messages table.
   * Memoized to prevent unnecessary re-renders.
   */
  const columns = useMemo(() => [
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => (
        <time
          dateTime={info.getValue().toISOString()}
          className="text-sm text-gray-600"
          title={formatDate(info.getValue())}
        >
          {formatDate(info.getValue())}
        </time>
      ),
      sortingFn: 'datetime',
      enableSorting: true,
    }),
    columnHelper.accessor('model', {
      header: 'Model',
      cell: (info) => (
        <span className="font-medium text-gray-900" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor('provider', {
      header: 'Provider',
      cell: (info) => {
        const provider = info.getValue();
        return provider ? (
          <span className="text-sm text-gray-600" title={provider}>
            {provider}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor('isSuccess', {
      header: 'Status',
      cell: (info) => {
        const isSuccess = info.getValue();
        const statusCode = info.row.original.statusCode;
        const error = info.row.original.error;
        
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isSuccess
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
              title={error || `HTTP ${statusCode}`}
            >
              {isSuccess ? '✓ Success' : '✗ Failed'}
            </span>
            {statusCode && (
              <span className="text-xs text-gray-500" title={`HTTP Status: ${statusCode}`}>
                {statusCode}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor('totalTokens', {
      header: 'Tokens',
      cell: (info) => {
        const tokens = info.getValue();
        return tokens ? (
          <span className="text-sm text-gray-900" title={`Total tokens: ${formatNumber(tokens)}`}>
            {formatNumber(tokens)}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor('responseTime', {
      header: 'Response Time',
      cell: (info) => {
        const responseTime = info.getValue();
        return responseTime ? (
          <span 
            className="text-sm text-gray-900" 
            title={`Response time: ${responseTime}ms`}
          >
            {responseTime}ms
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor('requestPreview', {
      header: 'Request Preview',
      cell: (info) => (
        <span 
          className="text-sm text-gray-600 font-mono" 
          title={info.getValue()}
        >
          {truncateText(info.getValue(), 40)}
        </span>
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('responsePreview', {
      header: 'Response Preview',
      cell: (info) => {
        const preview = info.getValue();
        return preview ? (
          <span 
            className="text-sm text-gray-600 font-mono" 
            title={preview}
          >
            {truncateText(preview, 40)}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      },
      enableSorting: false,
    }),
  ], []);

  /**
   * Convert our sort format to TanStack Table format.
   */
  const sorting = useMemo<SortingState>(() => [
    {
      id: sort.field,
      desc: sort.direction === 'desc',
    },
  ], [sort.field, sort.direction]);

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
    onSortingChange: (updater) => {
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
      <div className="wui-table-container" role="alert" aria-live="polite">
        <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-medium mb-2">Error Loading Messages</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="wui-table-container" aria-busy="true" aria-live="polite">
        <div className="p-6 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mb-2"></div>
          <p className="text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (messages.length === 0) {
    return (
      <div className="wui-table-container" role="status" aria-live="polite">
        <div className="p-6 text-center text-gray-500">
          <h3 className="text-lg font-medium mb-2">No Messages Found</h3>
          <p className="text-sm">There are no messages matching your current filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`wui-table-container ${className}`} role="region" aria-label="Messages table">
      <table className="wui-table" role="table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} role="row">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  role="columnheader"
                  className={`wui-table-header ${
                    header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                  tabIndex={header.column.getCanSort() ? 0 : -1}
                  onKeyDown={(e) => {
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
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-gray-400" aria-hidden="true">
                        {header.column.getIsSorted() === 'desc' 
                          ? '↓' 
                          : header.column.getIsSorted() === 'asc' 
                          ? '↑' 
                          : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} role="row" className="wui-table-row">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} role="gridcell" className="wui-table-cell">
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