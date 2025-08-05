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
        {/* Terminal-style header box */}
        <div className="border-2 border-primary bg-surface-subtle">
          {/* Top border with title */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-primary bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">┌─</span>
              <span className="text-primary font-bold text-sm tracking-wider">SALACIA</span>
              <span className="text-primary font-bold">─┐</span>
            </div>
            <div className="text-primary text-xs">
              v0.0.1
            </div>
          </div>
          
          {/* Navigation links in terminal style */}
          <div className="flex items-center gap-0 px-4 py-1">
            <span className="text-primary">│</span>
            <div className="flex gap-4 mx-4">
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
            <span className="text-primary ml-auto">│</span>
          </div>
          
          {/* Bottom border */}
          <div className="px-4 py-1">
            <div className="flex items-center">
              <span className="text-primary font-bold">└─</span>
              <div className="flex-1 border-t border-primary mx-1"></div>
              <span className="text-primary font-bold">─┘</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}