/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Creates an ASCII box layout using WebTUI CSS utilities exclusively.
 * Features a monospace terminal aesthetic with border styling.
 * 
 * @returns The terminal-style navigation bar with ASCII box design
 */
export function Navigation() {
  return (
    <nav data-nav="terminal">
      <div data-nav-container>
        {/* Terminal-style header box using WebTUI box utility */}
        <div box-="square">
          {/* Title and version header */}
          <div data-nav-header>
            <span data-nav-title>SALACIA</span>
            <div data-nav-version>v0.0.1</div>
          </div>
          
          {/* Navigation links */}
          <div data-nav-links>
            <a href="/" data-nav-link>[1] Home</a>
            <a href="/messages" data-nav-link>[2] Messages</a>
          </div>
        </div>
      </div>
    </nav>
  );
}