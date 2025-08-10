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
import { type MessageDisplay, type MessageStats } from '../lib/types/messages.js';
import type { MessageCreatedEventData } from '../lib/realtime/types.js';
import { defaultTransformMessage } from '../hooks/useRealtimeMessages.js';
import { useStatsSSE } from '../hooks/useStatsSSE.js';

/** Timeout for new message inactivity before resetting counter */
const NEW_MESSAGE_INACTIVITY_TIMEOUT_MS = 5000;

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
  /** Count of new messages received within the current burst window */
  newMessagesCount: number;
  clearNewMessages: () => void;
  addEventListener: (eventType: string, handler: (_event: SSEEvent) => void) => () => void;
  /** Stats SSE connection state */
  statsConnectionState: SSEConnectionState;
  /** Whether stats SSE is connected */
  statsIsConnected: boolean;
  /** Whether stats SSE is connecting */
  statsIsConnecting: boolean;
  /** Stats SSE error if any */
  statsError: Error | null;
  /** Stats data from SSE updates */
  statsData: {
    fiveMinute: MessageStats | null;
    twentyFourHour: MessageStats | null;
    overall: MessageStats | null;
    series: Array<{ day: string; total: number; failed: number; avg_rt: number; tokens: number }>;
    topModels: Array<{ model: string; count: number }>;
    timestamp: string;
  };
  /** Last stats update timestamp */
  statsLastUpdate: Date | null;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

/**
 * React provider that exposes a single global SSE connection and recent message buffer.
 * Uses /api/sse/messages and listens to connected, heartbeat, message:created events.
 */
/**
 * Provides realtime SSE data and maintains a burst window counter of new messages.
 * newMessagesCount increments for each message:created event and resets to 0 after
 * 3s of inactivity (no new messages). Clearing manually also resets the count.
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
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);

  const maxMessages = 100;

  // Messages SSE connection
  const { connectionState, lastEventId, error, addEventListener, isConnected, isConnecting } =
    useSSE('/api/sse/messages', {
      autoConnect: true,
      reconnect: true,
    });

  // Stats SSE connection
  const {
    connectionState: statsConnectionState,
    isConnected: statsIsConnected,
    isConnecting: statsIsConnecting,
    error: statsError,
    statsData,
    lastUpdate: statsLastUpdate,
  } = useStatsSSE({ autoConnect: true });

  const lastMessageCountRef = useRef(0);

  const handleMessageCreated = useCallback(
    (event: SSEEvent) => {
      try {
        const eventData = event.data as MessageCreatedEventData;
        const newMessage = defaultTransformMessage(eventData);

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
        setNewMessagesCount(c => c + 1);
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
          setHasNewMessages(false);
          setNewMessagesCount(0);
        }, NEW_MESSAGE_INACTIVITY_TIMEOUT_MS);
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

  const clearNewMessages = useCallback(() => {
    setHasNewMessages(false);
    setNewMessagesCount(0);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

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
      newMessagesCount,
      clearNewMessages,
      addEventListener,
      statsConnectionState,
      statsIsConnected,
      statsIsConnecting,
      statsError,
      statsData,
      statsLastUpdate,
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
      newMessagesCount,
      clearNewMessages,
      addEventListener,
      statsConnectionState,
      statsIsConnected,
      statsIsConnecting,
      statsError,
      statsData,
      statsLastUpdate,
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
