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
    connectionState,
    isConnected,
    isConnecting,
    hasNewMessages,
    newMessagesCount,
    clearNewMessages,
  } = useRealtime();
  const [isFlashing, setIsFlashing] = useState(false); // badge variant flash for connect states
  const [plusFlash, setPlusFlash] = useState(false); // dedicated +N flash
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
    const shouldFlash = isConnecting || (prevCountRef.current > 0 && newMessagesCount === 0);
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
  }, [newMessagesCount, isConnecting]);

  const status = useMemo(() => connectionState, [connectionState]);

  const getStatusVariant = () => {
    const base = () => {
      switch (status) {
        case 'connected':
          return 'green';
        case 'connecting':
        case 'reconnecting':
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
        case 'reconnecting':
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
      case 'reconnecting':
        return 'SYNC';
      case 'error':
        return 'ERR';
      case 'disconnected':
      default:
        return 'OFF';
    }
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
        <span is-="badge" variant-={getStatusVariant()} title={`Connection status: ${status}`}>
          {getStatusText()}
        </span>
        {isConnected && hasNewMessages && newMessagesCount > 0 && (
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
