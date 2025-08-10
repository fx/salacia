import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/realtime.js';

/** Flash duration for +N badge animation */
const PLUS_FLASH_DURATION_MS = 280;
/** Flash duration for connection state badge animation */
const VARIANT_FLASH_DURATION_MS = 300;

/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Features a monospace terminal aesthetic with integrated navigation links
 * and real-time connectivity status indicator.
 * Contained within the main layout's header area.
 *
 * @returns The terminal-style navigation bar with integrated header and navigation
 */
export function Navigation() {
  const {
    messages,
    connectionState,
    isConnected,
    isConnecting,
    hasNewMessages,
    newMessagesCount,
    statsConnectionState,
    statsIsConnected,
    statsIsConnecting,
    statsData,
    // statsLastUpdate, // Currently unused
    // stats, // Currently unused
  } = useRealtime();
  const [isFlashing, setIsFlashing] = useState(false); // badge variant flash for connect states
  const [plusFlash, setPlusFlash] = useState(false); // dedicated +N flash
  const [currentTime, setCurrentTime] = useState(new Date()); // for relative time calculation
  const prevCountRef = React.useRef(0);

  // Combined flash logic to avoid race condition with prevCountRef.current
  useEffect(() => {
    let plusTimeout: ReturnType<typeof setTimeout> | null = null;
    let variantTimeout: ReturnType<typeof setTimeout> | null = null;

    // +N flash logic: on increment
    if (newMessagesCount > prevCountRef.current) {
      setPlusFlash(true);
      plusTimeout = setTimeout(() => setPlusFlash(false), PLUS_FLASH_DURATION_MS);
    }

    // Variant flash logic: on connection transitions or clearing
    const shouldFlash =
      combinedIsConnecting || (prevCountRef.current > 0 && newMessagesCount === 0);
    if (shouldFlash) {
      setIsFlashing(true);
      variantTimeout = setTimeout(() => setIsFlashing(false), VARIANT_FLASH_DURATION_MS);
    }

    // Update prevCountRef after logic
    prevCountRef.current = newMessagesCount;

    return () => {
      if (plusTimeout) clearTimeout(plusTimeout);
      if (variantTimeout) clearTimeout(variantTimeout);
    };
  }, [newMessagesCount, isConnecting, statsIsConnecting]);

  // Update current time every second for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Combined connection state for flashing logic
  const combinedIsConnecting = isConnecting || statsIsConnecting;
  const combinedIsConnected = isConnected && statsIsConnected;

  // Calculate combined status from both message and stats SSE connections
  const status = useMemo(() => {
    // Priority order: error > connecting > connected > disconnected
    if (connectionState === 'error' || statsConnectionState === 'error') {
      return 'error';
    }
    if (
      connectionState === 'connecting' ||
      connectionState === 'reconnecting' ||
      statsConnectionState === 'connecting' ||
      statsConnectionState === 'reconnecting'
    ) {
      return 'connecting';
    }
    if (connectionState === 'connected' && statsConnectionState === 'connected') {
      return 'connected';
    }
    return 'disconnected';
  }, [connectionState, statsConnectionState]);

  const getStatusVariant = () => {
    const base = () => {
      switch (status) {
        case 'connected':
          return 'green';
        case 'connecting':
          return 'yellow';
        case 'error':
          return 'red';
        case 'disconnected':
        default:
          return 'surface0';
      }
    };

    if (isFlashing) {
      switch (status) {
        case 'connected':
          return 'teal';
        case 'connecting':
          return 'peach';
        case 'error':
          return 'maroon';
        default:
          return 'overlay1';
      }
    }

    return base();
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'LIVE';
      case 'connecting':
        return 'SYNC';
      case 'error':
        return 'ERR';
      case 'disconnected':
      default:
        return 'OFF';
    }
  };

  /**
   * Format stats summary for 5-minute window display
   */
  const formatStatsDisplay = () => {
    if (!statsData.fiveMinute) {
      return 'No data';
    }

    const { totalMessages, averageResponseTime, totalTokens } = statsData.fiveMinute;

    // Format response time
    const rtDisplay = averageResponseTime > 0 ? `${Math.round(averageResponseTime)}ms` : '0ms';

    // Format token count (e.g., 1.2k, 15k, etc.)
    const tokenDisplay =
      totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens.toString();

    return `5m: ${totalMessages} total, ${rtDisplay} avg, ${tokenDisplay} tokens`;
  };

  /**
   * Format relative time display (e.g., "1m 3s ago", "0s ago")
   */
  const formatRelativeTime = () => {
    // Get the timestamp of the most recent AI message
    const lastMessage = messages[0]; // Messages are sorted newest first

    if (!lastMessage || !lastMessage.createdAt) {
      return 'No messages';
    }

    const lastMessageTime = new Date(lastMessage.createdAt);
    const diffMs = currentTime.getTime() - lastMessageTime.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000)); // Ensure never negative

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }

    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}m ${seconds}s ago`;
  };

  return (
    <nav>
      <span>
        <a href="/">
          <span is-="badge">HOME</span>
        </a>
        <a href="/messages">
          <span is-="badge">MESSAGES</span>
        </a>
        <a href="/stats">
          <span is-="badge">STATS</span>
        </a>
      </span>
      <span>
        {combinedIsConnected && (
          <>
            <span is-="badge" variant-="surface1" title="Time since last AI interaction">
              {formatRelativeTime()}
            </span>
            <span is-="badge" variant-="blue" title="Statistics for last 5 minutes">
              {formatStatsDisplay()}
            </span>
          </>
        )}
        <span
          is-="badge"
          variant-={getStatusVariant()}
          title={`Connection status: ${status} (Messages: ${connectionState}, Stats: ${statsConnectionState})`}
        >
          {getStatusText()}
        </span>
        {combinedIsConnected && hasNewMessages && newMessagesCount > 0 && (
          <span
            is-="badge"
            variant-={plusFlash ? 'foreground0' : 'foreground1'}
            title="New realtime messages"
          >
            +{newMessagesCount}
          </span>
        )}
        <span is-="badge" variant-="yellow">
          SALACIA
        </span>
        <span is-="badge" variant-="background1">
          v0.0.1
        </span>
      </span>
    </nav>
  );
}
