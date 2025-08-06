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
    <div box-="square">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1lh' }}>
        <h3>Filters</h3>
        {activeFiltersCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1ch' }}>
            <small>
              {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} active
            </small>
            <button
              type="button"
              is-="button"
              variant-="link"
              onClick={clearAllFilters}
              disabled={disabled}
            >
              <small>Clear all</small>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1lh' }}>
        {/* Search term */}
        <div>
          <label htmlFor="search-term">
            <small><strong>Search</strong></small>
          </label>
          <input
            id="search-term"
            is-="input"
            type="text"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Search messages..."
            disabled={disabled}
            aria-describedby="search-term-help"
          />
          <p id="search-term-help">
            <small>Search in request and response content</small>
          </p>
        </div>

        {/* Model filter */}
        <div>
          <label htmlFor="model-filter">
            <small><strong>Model</strong></small>
          </label>
          <select
            id="model-filter"
            is-="select"
            value={filters.model || ''}
            onChange={(e) => updateFilter('model', e.target.value || undefined)}
            disabled={disabled}
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
        <div>
          <label htmlFor="provider-filter">
            <small><strong>Provider</strong></small>
          </label>
          <select
            id="provider-filter"
            is-="select"
            value={filters.provider || ''}
            onChange={(e) => updateFilter('provider', e.target.value || undefined)}
            disabled={disabled}
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
        <div>
          <label htmlFor="start-date">
            <small><strong>Start Date</strong></small>
          </label>
          <input
            id="start-date"
            is-="input"
            type="date"
            value={filters.startDate ? formatDateForInput(filters.startDate) : ''}
            onChange={(e) => updateFilter('startDate', e.target.value ? new Date(e.target.value) : undefined)}
            disabled={disabled}
          />
        </div>

        <div>
          <label htmlFor="end-date">
            <small><strong>End Date</strong></small>
          </label>
          <input
            id="end-date"
            is-="input"
            type="date"
            value={filters.endDate ? formatDateForInput(filters.endDate) : ''}
            onChange={(e) => updateFilter('endDate', e.target.value ? new Date(e.target.value) : undefined)}
            disabled={disabled}
          />
        </div>

        {/* Status filter */}
        <div>
          <label htmlFor="status-filter">
            <small><strong>Status</strong></small>
          </label>
          <select
            id="status-filter"
            is-="select"
            value={filters.hasError === undefined ? '' : filters.hasError ? 'error' : 'success'}
            onChange={(e) => {
              const value = e.target.value;
              updateFilter('hasError', value === '' ? undefined : value === 'error');
            }}
            disabled={disabled}
          >
            <option value="">All statuses</option>
            <option value="success">Success only</option>
            <option value="error">Errors only</option>
          </select>
        </div>

        {/* Token range */}
        <div>
          <label htmlFor="min-tokens">
            <small><strong>Min Tokens</strong></small>
          </label>
          <input
            id="min-tokens"
            is-="input"
            type="number"
            min="0"
            value={localMinTokens}
            onChange={(e) => setLocalMinTokens(e.target.value)}
            placeholder="0"
            disabled={disabled}
          />
        </div>

        <div>
          <label htmlFor="max-tokens">
            <small><strong>Max Tokens</strong></small>
          </label>
          <input
            id="max-tokens"
            is-="input"
            type="number"
            min="0"
            value={localMaxTokens}
            onChange={(e) => setLocalMaxTokens(e.target.value)}
            placeholder="Unlimited"
            disabled={disabled}
          />
        </div>

        {/* Response time range */}
        <div>
          <label htmlFor="min-response-time">
            <small><strong>Min Response Time (ms)</strong></small>
          </label>
          <input
            id="min-response-time"
            is-="input"
            type="number"
            min="0"
            value={localMinResponseTime}
            onChange={(e) => setLocalMinResponseTime(e.target.value)}
            placeholder="0"
            disabled={disabled}
          />
        </div>

        <div>
          <label htmlFor="max-response-time">
            <small><strong>Max Response Time (ms)</strong></small>
          </label>
          <input
            id="max-response-time"
            is-="input"
            type="number"
            min="0"
            value={localMaxResponseTime}
            onChange={(e) => setLocalMaxResponseTime(e.target.value)}
            placeholder="Unlimited"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export default TableFilters;