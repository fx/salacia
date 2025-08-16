/**
 * Date formatting utilities for compact UI display.
 *
 * @module DateUtils
 */

/**
 * Formats a date to a compact format for table display (M/D HH:mm:ss).
 *
 * @param date - Date to format
 * @returns Compact formatted date string
 */
export function formatCompactDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}
