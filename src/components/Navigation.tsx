/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Creates an ASCII box layout using WebTUI CSS utilities exclusively.
 * Features a monospace terminal aesthetic with border styling.
 * 
 * @returns The terminal-style navigation bar with ASCII box design
 */
export function Navigation() {
  return (
    <nav>
      <div box-="square">
        <div>
          <strong>SALACIA</strong> <small>v0.0.1</small>
        </div>
        <div>
          <a href="/">[1] Home</a> | <a href="/messages">[2] Messages</a>
        </div>
      </div>
    </nav>
  );
}