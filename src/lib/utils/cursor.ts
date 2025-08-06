/**
 * Cursor pagination utilities for encoding/decoding and validation.
 * Provides secure cursor handling without SQL injection risks.
 */

import { z } from 'zod';
import type {
  CursorData,
  SortField,
  SortDirection,
  CursorPaginationRequest,
  ValidatedPaginationParams,
} from '../types/pagination.js';

/**
 * Validation schema for cursor pagination requests.
 */
const paginationRequestSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50),
  cursor: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'model', 'totalTokens', 'responseTime'])
    .optional()
    .default('createdAt'),
  sortDirection: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

/**
 * Validation schema for cursor data structure.
 */
const cursorDataSchema = z.object({
  value: z.union([z.string(), z.number(), z.date()]),
  id: z.string().uuid(),
  field: z.enum(['createdAt', 'model', 'totalTokens', 'responseTime']),
  direction: z.enum(['asc', 'desc']),
});

/**
 * Encodes cursor data to a base64 string.
 * @param cursorData The cursor data to encode
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(cursorData: CursorData): string {
  const payload = {
    ...cursorData,
    // Convert Date to ISO string for JSON serialization
    value: cursorData.value instanceof Date 
      ? cursorData.value.toISOString() 
      : cursorData.value,
  };
  
  const jsonString = JSON.stringify(payload);
  return Buffer.from(jsonString, 'utf8').toString('base64url');
}

/**
 * Decodes a base64 cursor string to cursor data.
 * @param cursor The encoded cursor string
 * @returns Decoded cursor data
 * @throws Error if cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const jsonString = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonString);
    
    // Convert ISO string back to Date if the field is createdAt
    if (parsed.field === 'createdAt' && typeof parsed.value === 'string') {
      parsed.value = new Date(parsed.value);
    }
    
    const validated = cursorDataSchema.parse(parsed);
    return validated;
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Validates and normalizes pagination request parameters.
 * @param params Raw pagination request parameters
 * @returns Validated pagination parameters
 * @throws Error if validation fails
 */
export function validatePaginationParams(
  params: CursorPaginationRequest
): ValidatedPaginationParams {
  try {
    const validated = paginationRequestSchema.parse(params);
    
    const result: ValidatedPaginationParams = {
      limit: validated.limit,
      sortBy: validated.sortBy,
      sortDirection: validated.sortDirection,
    };
    
    if (validated.cursor) {
      result.cursor = decodeCursor(validated.cursor);
      
      // Ensure cursor sort field matches request sort field
      if (result.cursor.field !== result.sortBy || 
          result.cursor.direction !== result.sortDirection) {
        throw new Error('Cursor sort parameters do not match request parameters');
      }
    }
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid pagination parameters: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Creates a cursor from a data item for the specified field.
 * @param item Data item to create cursor from
 * @param field Sort field
 * @param direction Sort direction
 * @returns Cursor data structure
 */
export function createCursor(
  item: { id: string; createdAt: Date; model: string; totalTokens: number; responseTime: number },
  field: SortField,
  direction: SortDirection
): CursorData {
  let value: string | number | Date;
  
  switch (field) {
    case 'createdAt':
      value = item.createdAt;
      break;
    case 'model':
      value = item.model;
      break;
    case 'totalTokens':
      value = item.totalTokens;
      break;
    case 'responseTime':
      value = item.responseTime;
      break;
    default:
      throw new Error(`Unsupported sort field: ${field}`);
  }
  
  return {
    value,
    id: item.id,
    field,
    direction,
  };
}