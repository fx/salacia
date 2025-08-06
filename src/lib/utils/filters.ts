/**
 * Filter utility functions for message filtering operations.
 *
 * This module provides reusable functions for counting and managing
 * message filter parameters to avoid code duplication across components.
 *
 * @module filters
 */

import type { MessagesFilterParams } from '../types/messages.js';

/**
 * Counts the number of active filters excluding search term.
 *
 * @param filters - The filter parameters object
 * @returns Number of active non-search filters
 */
export function countActiveNonSearchFilters(filters: MessagesFilterParams): number {
  return Object.entries(filters).filter(
    ([key, value]) => key !== 'searchTerm' && value !== undefined && value !== null && value !== ''
  ).length;
}

/**
 * Counts the total number of active filters including search term.
 *
 * @param filters - The filter parameters object
 * @returns Total number of active filters
 */
export function countActiveFilters(filters: MessagesFilterParams): number {
  return Object.values(filters).filter(
    value => value !== undefined && value !== null && value !== ''
  ).length;
}
