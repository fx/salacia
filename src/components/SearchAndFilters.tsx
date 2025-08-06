/**
 * SearchAndFilters component for message search and filter controls.
 * 
 * This component provides a clean interface with a search input that is always
 * visible and a "Filters" button that opens the FilterDialog for advanced options.
 * Uses WebTUI design system for consistent styling.
 * 
 * Features:
 * - Debounced search input for performance
 * - Filters button with active filter count badge
 * - Integration with FilterDialog component
 * - Accessible form controls with proper labeling
 * - Loading state support
 * 
 * @module SearchAndFilters
 */

import React, { useState, useEffect } from 'react';
import { FilterDialog } from './FilterDialog.js';
import type { MessagesFilterParams } from '../lib/types/messages.js';

/**
 * Props for the SearchAndFilters component.
 */
export interface SearchAndFiltersProps {
  /** Current filter values */
  filters: MessagesFilterParams;
  /** Callback function called when filters change */
  onFiltersChange: (filters: MessagesFilterParams) => void;
  /** Available model options for filter dropdown */
  availableModels?: string[];
  /** Available provider options for filter dropdown */
  availableProviders?: string[];
  /** Whether controls are disabled (e.g., during loading) */
  disabled?: boolean;
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
 * SearchAndFilters component providing search input and filter dialog access.
 * Manages search state locally with debouncing for better performance.
 * 
 * @param props - Component props
 * @returns JSX element representing the search and filters interface
 */
export function SearchAndFilters({
  filters,
  onFiltersChange,
  availableModels = [],
  availableProviders = [],
  disabled = false,
}: SearchAndFiltersProps): React.ReactElement {
  // Local state for search input
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Debounced search term to reduce API calls
  const debouncedSearchTerm = useDebounce(localSearchTerm, 500);

  /**
   * Update filters when debounced search term changes.
   */
  useEffect(() => {
    if (debouncedSearchTerm !== (filters.searchTerm || '')) {
      const newFilters: MessagesFilterParams = {
        ...filters,
        searchTerm: debouncedSearchTerm || undefined,
      };
      onFiltersChange(newFilters);
    }
  }, [debouncedSearchTerm, filters, onFiltersChange]);

  /**
   * Handle filter changes from the dialog.
   */
  const handleFiltersApply = (newFilters: MessagesFilterParams) => {
    onFiltersChange(newFilters);
  };

  /**
   * Count active non-search filters for the badge.
   */
  const activeNonSearchFilters = Object.entries(filters).filter(([key, value]) => 
    key !== 'searchTerm' && value !== undefined && value !== null && value !== ''
  ).length;

  /**
   * Clear all filters including search.
   */
  const clearAllFilters = () => {
    setLocalSearchTerm('');
    onFiltersChange({});
  };

  /**
   * Count total active filters including search.
   */
  const totalActiveFilters = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length;

  return (
    <>
      <div box-="square">
        {/* Search input with label on left and Filters button */}
        <label htmlFor="message-search">
          <strong>Search: </strong>
          <input
            id="message-search"
            type="text"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Search messages..."
            disabled={disabled}
          />
          {' '}
          <button
            type="button"
            onClick={() => setIsFilterDialogOpen(true)}
            disabled={disabled}
            size-="small"
          >
            Filters
            {activeNonSearchFilters > 0 && (
              <>
                {' '}
                <span variant-="badge">
                  {activeNonSearchFilters}
                </span>
              </>
            )}
          </button>
        </label>

        {/* Active filters summary */}
        {totalActiveFilters > 0 && (
          <div style={{ marginTop: '1lh' }}>
            <small>
              {totalActiveFilters} filter{totalActiveFilters === 1 ? '' : 's'} active
              {filters.searchTerm && ` • Search: "${filters.searchTerm}"`}
              {filters.model && ` • Model: ${filters.model}`}
              {filters.provider && ` • Provider: ${filters.provider}`}
              {filters.hasError !== undefined && ` • Status: ${filters.hasError ? 'Error' : 'Success'}`}
              {filters.startDate && ` • From: ${filters.startDate.toLocaleDateString()}`}
              {filters.endDate && ` • To: ${filters.endDate.toLocaleDateString()}`}
            </small>
            {' '}
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={disabled}
              size-="small"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filter dialog */}
      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        filters={filters}
        onFiltersApply={handleFiltersApply}
        availableModels={availableModels}
        availableProviders={availableProviders}
        disabled={disabled}
      />
    </>
  );
}

export default SearchAndFilters;