/**
 * FilterDialog component for advanced message filtering options.
 * 
 * This component provides a modal dialog containing all filter options
 * except search, which remains in the main interface. Uses WebTUI dialog
 * component for consistent styling and native HTML dialog functionality.
 * 
 * Features:
 * - Model and provider selection dropdowns
 * - Date range picker for filtering by creation date
 * - Status filter for success/error messages
 * - Numerical range inputs for tokens and response time
 * - Apply and Cancel buttons for filter management
 * - Clear all filters functionality
 * - Accessible form controls with proper labeling
 * 
 * @module FilterDialog
 */

import React, { useState, useEffect, useRef } from 'react';
import type { MessagesFilterParams } from '../lib/types/messages.js';

/**
 * Props for the FilterDialog component.
 */
export interface FilterDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Current filter values */
  filters: MessagesFilterParams;
  /** Callback function called when filters are applied */
  onFiltersApply: (filters: MessagesFilterParams) => void;
  /** Available model options for dropdown */
  availableModels?: string[];
  /** Available provider options for dropdown */
  availableProviders?: string[];
  /** Whether filters are disabled (e.g., during loading) */
  disabled?: boolean;
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
 * FilterDialog component providing a modal interface for advanced filtering.
 * Uses native HTML dialog with WebTUI styling and proper accessibility.
 * 
 * @param props - Component props
 * @returns JSX element representing the filter dialog
 */
export function FilterDialog({
  isOpen,
  onClose,
  filters,
  onFiltersApply,
  availableModels = [],
  availableProviders = [],
  disabled = false,
}: FilterDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  // Local state for form values
  const [localFilters, setLocalFilters] = useState<MessagesFilterParams>(filters);

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
   * Reset local filters when dialog opens or external filters change.
   */
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

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
    const isInDialog = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
    
    if (!isInDialog) {
      handleDialogClose();
    }
  };

  /**
   * Handle applying filters and closing dialog.
   */
  const handleApplyFilters = () => {
    onFiltersApply(localFilters);
    onClose();
  };

  /**
   * Handle canceling changes and closing dialog.
   */
  const handleCancel = () => {
    setLocalFilters(filters); // Reset to original values
    onClose();
  };

  /**
   * Clear all filters.
   */
  const clearAllFilters = () => {
    setLocalFilters({
      searchTerm: filters.searchTerm, // Keep search term as it's not in the dialog
    });
  };

  /**
   * Update a single filter value.
   */
  const updateFilter = <K extends keyof MessagesFilterParams>(
    key: K,
    value: MessagesFilterParams[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Count active non-search filters.
   */
  const activeFiltersCount = Object.entries(localFilters).filter(([key, value]) => 
    key !== 'searchTerm' && value !== undefined && value !== null && value !== ''
  ).length;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      position-="center"
      box-="square"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <h2>Filters</h2>
            
        {/* Model filter */}
        <div>
          <label htmlFor="dialog-model-filter">
            <strong>Model</strong>
          </label>
              <select
                is-="select"
                id="dialog-model-filter"
                value={localFilters.model || ''}
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
              <label htmlFor="dialog-provider-filter">
                <strong>Provider</strong>
              </label>
              <select
                is-="select"
                id="dialog-provider-filter"
                value={localFilters.provider || ''}
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

        {/* Status filter */}
        <div>
              <label htmlFor="dialog-status-filter">
                <strong>Status</strong>
              </label>
              <select
                is-="select"
                id="dialog-status-filter"
                value={localFilters.hasError === undefined ? '' : localFilters.hasError ? 'error' : 'success'}
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

        {/* Start date */}
        <div>
              <label htmlFor="dialog-start-date">
                <strong>Start Date</strong>
              </label>
              <input
                is-="input"
                id="dialog-start-date"
                type="date"
                value={localFilters.startDate ? formatDateForInput(localFilters.startDate) : ''}
                onChange={(e) => updateFilter('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                disabled={disabled}
              />
        </div>

        {/* End date */}
        <div>
              <label htmlFor="dialog-end-date">
                <strong>End Date</strong>
              </label>
              <input
                is-="input"
                id="dialog-end-date"
                type="date"
                value={localFilters.endDate ? formatDateForInput(localFilters.endDate) : ''}
                onChange={(e) => updateFilter('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                disabled={disabled}
              />
        </div>

        {/* Min tokens */}
        <div>
              <label htmlFor="dialog-min-tokens">
                <strong>Min Tokens</strong>
              </label>
              <input
                is-="input"
                id="dialog-min-tokens"
                type="number"
                min="0"
                value={localFilters.minTokens?.toString() || ''}
                onChange={(e) => updateFilter('minTokens', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="0"
                disabled={disabled}
              />
        </div>

        {/* Max tokens */}
        <div>
              <label htmlFor="dialog-max-tokens">
                <strong>Max Tokens</strong>
              </label>
              <input
                is-="input"
                id="dialog-max-tokens"
                type="number"
                min="0"
                value={localFilters.maxTokens?.toString() || ''}
                onChange={(e) => updateFilter('maxTokens', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Unlimited"
                disabled={disabled}
              />
        </div>

        {/* Min response time */}
        <div>
              <label htmlFor="dialog-min-response-time">
                <strong>Min Response Time (ms)</strong>
              </label>
              <input
                is-="input"
                id="dialog-min-response-time"
                type="number"
                min="0"
                value={localFilters.minResponseTime?.toString() || ''}
                onChange={(e) => updateFilter('minResponseTime', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="0"
                disabled={disabled}
              />
        </div>

        {/* Max response time */}
        <div>
              <label htmlFor="dialog-max-response-time">
                <strong>Max Response Time (ms)</strong>
              </label>
              <input
                is-="input"
                id="dialog-max-response-time"
                type="number"
                min="0"
                value={localFilters.maxResponseTime?.toString() || ''}
                onChange={(e) => updateFilter('maxResponseTime', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Unlimited"
                disabled={disabled}
              />
        </div>

        <hr />

        <div>
          {activeFiltersCount > 0 && (
            <>
              <small>
                {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} active
              </small>
              {' '}
              <button
                is-="button"
                type="button"
                onClick={clearAllFilters}
                disabled={disabled}
              >
                Clear all
              </button>
            </>
          )}
        </div>
        
        <div>
          <button
            is-="button"
            type="button"
            onClick={handleCancel}
            disabled={disabled}
          >
            Cancel
          </button>
          {' '}
          <button
            is-="button"
            type="button"
            onClick={handleApplyFilters}
            disabled={disabled}
            variant-="primary"
          >
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default FilterDialog;