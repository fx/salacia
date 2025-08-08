/**
 * Hooks exports for client-side functionality.
 * 
 * @module hooks
 */

export { useDebounce, type default as UseDebounceHook } from './useDebounce.js';
export { 
  useSSE, 
  type SSEConnectionState, 
  type SSEEvent, 
  type SSEOptions, 
  type SSEEventHandler, 
  type SSEErrorHandler,
  type default as UseSSEHook 
} from './useSSE.js';
export { 
  useRealtimeMessages, 
  type RealtimeMessagesOptions, 
  type RealtimeMessageStats,
  type default as UseRealtimeMessagesHook 
} from './useRealtimeMessages.js';