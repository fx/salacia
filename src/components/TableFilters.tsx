/**
 * TableFilters component for filtering messages table data.
 * 
 * This component provides a comprehensive filtering interface for the messages table,
 * including text search, date ranges, model selection, and numerical filters.
 * Uses WebTUI design system for consistent styling and accessibility.
 * 
 * Features:
 * - Text search with debounced input
 * - Date range picker for filtering by creation date
 * - Dropdown filters for model and provider selection
 * - Numerical range inputs for tokens and response time
 * - Success/error status toggle
 * - Clear all filters functionality
 * - Accessible form controls with proper labeling
 * 
 * @module TableFilters
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { MessagesFilterParams } from '../lib/types/messages.js';

/**
 * Props for the TableFilters component.
 */
export interface TableFiltersProps {
  /** Current filter values */
  filters: MessagesFilterParams;
  /** Callback function called when filters change */
  onFiltersChange: (filters: MessagesFilterParams) => void;
  /** Available model options for dropdown */
  availableModels?: string[];
  /** Available provider options for dropdown */
  availableProviders?: string[];
  /** Whether filters are disabled (e.g., during loading) */
  disabled?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Hook for debouncing input values to avoid excessive API calls.
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Formats a date to YYYY-MM-DD format for HTML date inputs.
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * TableFilters component providing comprehensive filtering controls for messages.
 * Integrates with WebTUI design system and includes debounced inputs for performance.
 * 
 * @param props - Component props
 * @returns JSX element representing the filter controls
 */
export function TableFilters({
  filters,
  onFiltersChange,
  availableModels = [],
  availableProviders = [],
  disabled = false,
  className = '',
}: TableFiltersProps): React.ReactElement {
  // Local state for immediate UI updates
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');
  const [localMinTokens, setLocalMinTokens] = useState(filters.minTokens?.toString() || '');
  const [localMaxTokens, setLocalMaxTokens] = useState(filters.maxTokens?.toString() || '');
  const [localMinResponseTime, setLocalMinResponseTime] = useState(filters.minResponseTime?.toString() || '');
  const [localMaxResponseTime, setLocalMaxResponseTime] = useState(filters.maxResponseTime?.toString() || '');

  // Debounced values to reduce API calls
  const debouncedSearchTerm = useDebounce(localSearchTerm, 500);
  const debouncedMinTokens = useDebounce(localMinTokens, 500);
  const debouncedMaxTokens = useDebounce(localMaxTokens, 500);
  const debouncedMinResponseTime = useDebounce(localMinResponseTime, 500);
  const debouncedMaxResponseTime = useDebounce(localMaxResponseTime, 500);

  /**
   * Updates filters when debounced values change.
   */
  useEffect(() => {
    const newFilters: MessagesFilterParams = {
      ...filters,
      searchTerm: debouncedSearchTerm || undefined,
      minTokens: debouncedMinTokens ? parseInt(debouncedMinTokens, 10) : undefined,
      maxTokens: debouncedMaxTokens ? parseInt(debouncedMaxTokens, 10) : undefined,
      minResponseTime: debouncedMinResponseTime ? parseInt(debouncedMinResponseTime, 10) : undefined,
      maxResponseTime: debouncedMaxResponseTime ? parseInt(debouncedMaxResponseTime, 10) : undefined,
    };

    // Only update if something actually changed
    const hasChanges = (
      newFilters.searchTerm !== filters.searchTerm ||
      newFilters.minTokens !== filters.minTokens ||
      newFilters.maxTokens !== filters.maxTokens ||
      newFilters.minResponseTime !== filters.minResponseTime ||
      newFilters.maxResponseTime !== filters.maxResponseTime
    );

    if (hasChanges) {
      onFiltersChange(newFilters);
    }
  }, [
    debouncedSearchTerm,
    debouncedMinTokens,
    debouncedMaxTokens,
    debouncedMinResponseTime,
    debouncedMaxResponseTime,
    filters,
    onFiltersChange,
  ]);

  /**
   * Handles direct filter updates (non-debounced inputs).
   */
  const updateFilter = useCallback(<K extends keyof MessagesFilterParams>(
    key: K,
    value: MessagesFilterParams[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  /**
   * Clears all filters and resets local state.
   */
  const clearAllFilters = useCallback(() => {
    setLocalSearchTerm('');
    setLocalMinTokens('');
    setLocalMaxTokens('');
    setLocalMinResponseTime('');
    setLocalMaxResponseTime('');
    onFiltersChange({});
  }, [onFiltersChange]);

  /**
   * Counts the number of active filters for UI display.
   */
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} active
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={disabled}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search term */}
        <div className="space-y-1">
          <label htmlFor="search-term" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="search-term"
            type="text"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Search messages..."
            disabled={disabled}
            className="wui-input w-full"
            aria-describedby="search-term-help"
          />
          <p id="search-term-help" className="text-xs text-gray-500">
            Search in request and response content
          </p>
        </div>

        {/* Model filter */}
        <div className="space-y-1">
          <label htmlFor="model-filter" className="block text-sm font-medium text-gray-700">
            Model
          </label>
          <select
            id="model-filter"
            value={filters.model || ''}
            onChange={(e) => updateFilter('model', e.target.value || undefined)}
            disabled={disabled}
            className="wui-select w-full"
          >
            <option value="">All models</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Provider filter */}
        <div className="space-y-1">
          <label htmlFor="provider-filter" className="block text-sm font-medium text-gray-700">
            Provider
          </label>
          <select
            id="provider-filter"
            value={filters.provider || ''}
            onChange={(e) => updateFilter('provider', e.target.value || undefined)}
            disabled={disabled}
            className="wui-select w-full"
          >
            <option value="">All providers</option>
            {availableProviders.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="space-y-1">
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={filters.startDate ? formatDateForInput(filters.startDate) : ''}
            onChange={(e) => updateFilter('startDate', e.target.value ? new Date(e.target.value) : undefined)}
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={filters.endDate ? formatDateForInput(filters.endDate) : ''}
            onChange={(e) => updateFilter('endDate', e.target.value ? new Date(e.target.value) : undefined)}
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>

        {/* Status filter */}
        <div className="space-y-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.hasError === undefined ? '' : filters.hasError ? 'error' : 'success'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('hasError', value === '' ? undefined : value === 'error');
            }}
            disabled={disabled}
            className="wui-select w-full"
          >
            <option value="">All statuses</option>
            <option value="success">Success only</option>
            <option value="error">Errors only</option>
          </select>
        </div>

        {/* Token range */}
        <div className="space-y-1">
          <label htmlFor="min-tokens" className="block text-sm font-medium text-gray-700">
            Min Tokens
          </label>
          <input
            id="min-tokens"
            type="number"
            min="0"
            value={localMinTokens}
            onChange={(e) => setLocalMinTokens(e.target.value)}
            placeholder="0"
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="max-tokens" className="block text-sm font-medium text-gray-700">
            Max Tokens
          </label>
          <input
            id="max-tokens"
            type="number"
            min="0"
            value={localMaxTokens}
            onChange={(e) => setLocalMaxTokens(e.target.value)}
            placeholder="Unlimited"
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>

        {/* Response time range */}
        <div className="space-y-1">
          <label htmlFor="min-response-time" className="block text-sm font-medium text-gray-700">
            Min Response Time (ms)
          </label>
          <input
            id="min-response-time"
            type="number"
            min="0"
            value={localMinResponseTime}
            onChange={(e) => setLocalMinResponseTime(e.target.value)}
            placeholder="0"
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="max-response-time" className="block text-sm font-medium text-gray-700">
            Max Response Time (ms)
          </label>
          <input
            id="max-response-time"
            type="number"
            min="0"
            value={localMaxResponseTime}
            onChange={(e) => setLocalMaxResponseTime(e.target.value)}
            placeholder="Unlimited"
            disabled={disabled}
            className="wui-input w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default TableFilters;