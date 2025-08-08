import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/realtime.js';

/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Features a monospace terminal aesthetic with integrated navigation links
 * and real-time connectivity status indicator.
 * Contained within the main layout's header area.
 *
 * @returns The terminal-style navigation bar with integrated header and navigation
 */
export function Navigation() {
  const { connectionState, isConnected, isConnecting, hasNewMessages, clearNewMessages } =
    useRealtime();
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (hasNewMessages || isConnecting) {
      setIsFlashing(true);
      const t = setTimeout(() => setIsFlashing(false), 800);
      return () => clearTimeout(t);
    }
  }, [hasNewMessages, isConnecting, connectionState]);

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
      </span>
      <span>
        <span is-="badge" variant-={getStatusVariant()} title={`Connection status: ${status}`}>
          {getStatusText()}
        </span>
        {isConnected && hasNewMessages && (
          <button
            type="button"
            onClick={clearNewMessages}
            is-="badge"
            variant-="teal"
            title="New realtime messages"
          >
            NEW
          </button>
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
