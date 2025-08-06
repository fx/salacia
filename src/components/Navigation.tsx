/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Features a monospace terminal aesthetic with integrated navigation links.
 * Contained within the main layout's header area.
 *
 * @returns The terminal-style navigation bar with integrated header and navigation
 */
export function Navigation() {
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
