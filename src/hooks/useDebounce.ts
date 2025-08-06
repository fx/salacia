/**
 * Hook for debouncing input values to avoid excessive API calls.
 *
 * This hook delays updating the returned value until after the specified delay
 * has passed without the input value changing. Useful for search inputs and
 * other user inputs that trigger expensive operations.
 *
 * @template T - Type of the value being debounced
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds before updating the debounced value
 * @returns Debounced value that updates after the delay period
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * // API call only fires after user stops typing for 500ms
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 *
 * @module useDebounce
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values to improve performance.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
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

export default useDebounce;