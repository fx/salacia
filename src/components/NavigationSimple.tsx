import React from 'react';

/**
 * Simplified navigation component without realtime features.
 * Used for settings pages and other views that don't need SSE connections.
 * Features a monospace terminal aesthetic with integrated navigation links.
 *
 * @returns The terminal-style navigation bar
 */
export function NavigationSimple() {
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
        <a href="/settings">
          <span is-="badge">SETTINGS</span>
        </a>
      </span>
      <span>
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
