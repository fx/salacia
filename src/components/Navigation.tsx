/**
 * Terminal-style navigation component designed to mimic Claude Code's interface.
 * Creates an ASCII box layout using WebTUI CSS utilities exclusively.
 * Features a monospace terminal aesthetic with border styling.
 * 
 * @returns The terminal-style navigation bar with ASCII box design
 */
export function Navigation() {
  return (
    <nav className="w-full bg-surface border-b-2 border-primary shrink-0">
      <div className="w-full p-2">
        {/* Terminal-style header box using WebTUI box utility */}
        <div box-="square" className="bg-surface-subtle">
          {/* Title and version header */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-primary bg-surface">
            <span className="text-primary font-bold text-sm tracking-wider">SALACIA</span>
            <div className="text-primary text-xs">
              v0.0.1
            </div>
          </div>
          
          {/* Navigation links */}
          <div className="flex items-center gap-4 px-4 py-1">
            <a 
              href="/" 
              className="text-foreground hover:text-primary hover:bg-surface-hover px-2 py-1 text-sm font-mono border border-transparent hover:border-primary transition-all duration-150"
            >
              [1] Home
            </a>
            <a 
              href="/messages" 
              className="text-foreground hover:text-primary hover:bg-surface-hover px-2 py-1 text-sm font-mono border border-transparent hover:border-primary transition-all duration-150"
            >
              [2] Messages
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}