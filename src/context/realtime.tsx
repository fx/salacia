import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSSE, type SSEEvent, type SSEConnectionState } from '../hooks/useSSE.js';
import { MESSAGES_CONSTANTS, type MessageDisplay } from '../lib/types/messages.js';
import type { MessageCreatedEventData } from '../lib/realtime/types.js';

/**
 * Statistics for real-time message tracking.
 */
export interface RealtimeStats {
  totalReceived: number;
  successCount: number;
  errorCount: number;
  connectionUptime: number;
  lastEventTime?: Date;
}

/**
 * Context value for global realtime SSE connection and message buffer.
 */
export interface RealtimeContextValue {
  connectionState: SSEConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  lastEventId?: string;
  error: Error | null;
  messages: MessageDisplay[];
  stats: RealtimeStats;
  hasNewMessages: boolean;
  clearNewMessages: () => void;
  addEventListener: (eventType: string, handler: (_event: SSEEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

/**
 * Converts SSE message:created event data into a MessageDisplay for UI.
 */
function transformMessage(eventData: MessageCreatedEventData): MessageDisplay {
  let requestPreview = 'No request data';
  if (eventData.request) {
    try {
      const reqStr =
        typeof eventData.request === 'string'
          ? eventData.request
          : JSON.stringify(eventData.request);
      requestPreview =
        reqStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${reqStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : reqStr;
    } catch {
      requestPreview = 'Invalid request data';
    }
  }

  let responsePreview: string | undefined;
  if (eventData.response) {
    try {
      const resStr =
        typeof eventData.response === 'string'
          ? eventData.response
          : JSON.stringify(eventData.response);
      responsePreview =
        resStr.length > MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH
          ? `${resStr.substring(0, MESSAGES_CONSTANTS.MESSAGE_PREVIEW_MAX_LENGTH)}...`
          : resStr;
    } catch {
      responsePreview = 'Invalid response data';
    }
  }

  const statusCode = eventData.statusCode ?? undefined;
  const err = eventData.error ?? undefined;

  return {
    id: eventData.id,
    model: eventData.model ?? 'unknown',
    provider: undefined,
    createdAt: new Date(eventData.createdAt),
    responseTime: eventData.responseTimeMs ?? undefined,
    totalTokens: eventData.totalTokens ?? undefined,
    promptTokens: eventData.promptTokens ?? undefined,
    completionTokens: eventData.completionTokens ?? undefined,
    statusCode,
    error: err,
    requestPreview,
    responsePreview,
    isSuccess: !err && statusCode === 200,
    request: eventData.request ?? null,
    response: eventData.response,
  };
}

/**
 * React provider that exposes a single global SSE connection and recent message buffer.
 * Uses /api/sse/messages and listens to connected, heartbeat, message:created events.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [stats, setStats] = useState<RealtimeStats>({
    totalReceived: 0,
    successCount: 0,
    errorCount: 0,
    connectionUptime: 0,
  });
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);

  const maxMessages = 100;

  const { connectionState, lastEventId, error, addEventListener, isConnected, isConnecting } =
    useSSE('/api/sse/messages', {
      autoConnect: true,
      reconnect: true,
    });

  const lastMessageCountRef = useRef(0);

  const handleMessageCreated = useCallback(
    (event: SSEEvent) => {
      try {
        const eventData = event.data as MessageCreatedEventData;
        const newMessage = transformMessage(eventData);

        setMessages(prev => {
          const existingIndex = prev.findIndex(m => m.id === newMessage.id);
          let updated: MessageDisplay[];
          if (existingIndex !== -1) {
            updated = [...prev];
            updated[existingIndex] = newMessage;
          } else {
            updated = [newMessage, ...prev];
          }
          if (maxMessages > 0 && updated.length > maxMessages) {
            updated = updated.slice(0, maxMessages);
          }
          return updated;
        });

        setStats(prev => ({
          totalReceived: prev.totalReceived + 1,
          successCount: newMessage.isSuccess ? prev.successCount + 1 : prev.successCount,
          errorCount: !newMessage.isSuccess ? prev.errorCount + 1 : prev.errorCount,
          connectionUptime: connectionStartTime ? Date.now() - connectionStartTime.getTime() : 0,
          lastEventTime: new Date(),
        }));

        setHasNewMessages(true);
      } catch {
        /* noop */
      }
    },
    [connectionStartTime]
  );

  const handleConnected = useCallback((_event: SSEEvent) => {
    setConnectionStartTime(new Date());
  }, []);

  const handleHeartbeat = useCallback(
    (_event: SSEEvent) => {
      setStats(prev => ({
        ...prev,
        connectionUptime: connectionStartTime ? Date.now() - connectionStartTime.getTime() : 0,
      }));
    },
    [connectionStartTime]
  );

  useEffect(() => {
    const offCreated = addEventListener('message:created', handleMessageCreated);
    const offConnected = addEventListener('connected', handleConnected);
    const offHeartbeat = addEventListener('heartbeat', handleHeartbeat);
    return () => {
      offCreated();
      offConnected();
      offHeartbeat();
    };
  }, [addEventListener, handleMessageCreated, handleConnected, handleHeartbeat]);

  useEffect(() => {
    if (connectionState === 'connected') {
      setConnectionStartTime(new Date());
    }
    if (connectionState === 'disconnected' || connectionState === 'error') {
      setConnectionStartTime(null);
    }
  }, [connectionState]);

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  const clearNewMessages = useCallback(() => setHasNewMessages(false), []);

  const value: RealtimeContextValue = useMemo(
    () => ({
      connectionState,
      isConnected,
      isConnecting,
      lastEventId,
      error,
      messages,
      stats,
      hasNewMessages,
      clearNewMessages,
      addEventListener,
    }),
    [
      connectionState,
      isConnected,
      isConnecting,
      lastEventId,
      error,
      messages,
      stats,
      hasNewMessages,
      clearNewMessages,
      addEventListener,
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/**
 * Accessor hook for the global realtime context.
 */
export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
