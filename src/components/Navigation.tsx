/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Creates an ASCII box layout using WebTUI CSS utilities exclusively.
 * Features a monospace terminal aesthetic with border styling and integrated navigation links.
 * 
 * @returns The terminal-style navigation bar with integrated header and navigation
 */
export function Navigation() {
  return (
    <nav style={{ padding: '1ch' }}>
      <div box-="square" style={{ padding: '1ch 2ch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2ch' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span is-="badge" variant-="blue">HOME</span>
            </a>
            <a href="/messages" style={{ textDecoration: 'none' }}>
              <span is-="badge" variant-="background1">MESSAGES</span>
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1ch' }}>
            <span is-="badge" variant-="yellow">SALACIA</span>
            <span is-="badge" variant-="background1">v0.0.1</span>
          </div>
        </div>
      </div>
    </nav>
  );
}