/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Creates an ASCII box layout using WebTUI CSS utilities exclusively.
 * Features a monospace terminal aesthetic with border styling.
 * 
 * @returns The terminal-style navigation bar with ASCII box design
 */
export function Navigation() {
  return (
    <nav style={{ padding: '1ch' }}>
      <div box-="square" style={{ padding: '1ch 2ch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5lh' }}>
          <span is-="badge" variant-="blue">SALACIA</span>
          <span is-="badge" variant-="background1">v0.0.1</span>
        </div>
        <div is-="separator"></div>
        <div style={{ marginTop: '0.5lh' }}>
          <a href="/"><button variant-="primary">[1] Home</button></a>{' '}
          <a href="/messages"><button variant-="background1">[2] Messages</button></a>
        </div>
      </div>
    </nav>
  );
}