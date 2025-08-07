import { useConnectivityStatus } from '../hooks/useConnectivityStatus.js';

/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Features a monospace terminal aesthetic with integrated navigation links
 * and real-time connectivity status indicator.
 * Contained within the main layout's header area.
 *
 * @returns The terminal-style navigation bar with integrated header and navigation
 */
export function Navigation() {
  const { status, isFlashing } = useConnectivityStatus({
    sseUrl: '/api/messages/stream',
    autoReconnect: true,
    flashDuration: 800,
  });

  /**
   * Gets the appropriate badge variant for the connection status.
   */
  const getStatusVariant = () => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'disconnected':
        return 'surface0';
      case 'error':
        return 'red';
      default:
        return 'surface0';
    }
  };

  /**
   * Gets the display text for the connection status.
   */
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'LIVE';
      case 'connecting':
        return 'SYNC';
      case 'disconnected':
        return 'OFF';
      case 'error':
        return 'ERR';
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
        <span
          is-="badge"
          variant-={getStatusVariant()}
          style={isFlashing ? { animation: 'flash 0.8s ease-in-out' } : undefined}
          title={`Connection status: ${status}`}
        >
          {getStatusText()}
        </span>
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
