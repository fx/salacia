/**
 * Terminal-style navigation component with ASCII box drawing characters.
 * Provides navigation within terminal layout using box drawing aesthetics
 * similar to Claude Code interface with dense information hierarchy.
 * 
 * @returns ASCII box navigation bar with terminal styling
 */
export function Navigation() {
  return (
    <nav data-webtui-nav="terminal" style={{
      height: '3lh',
      display: 'flex',
      fontSize: '1ch',
      lineHeight: '1lh',
      fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
    }}>
      {/* Left border continuation */}
      <div data-webtui-border="nav-left" style={{
        width: '1ch',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div>│</div>
        <div>│</div>
        <div>│</div>
      </div>
      
      {/* Navigation content */}
      <div data-webtui-nav="content" style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Title and separator line */}
        <div data-webtui-nav="header" style={{
          height: '1lh',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '2ch'
        }}>
          <span data-webtui-title="app" style={{ fontWeight: 'bold' }}>SALACIA</span>
          <span style={{ marginLeft: '2ch', opacity: 0.7 }}>━ LLM INFERENCE PROXY</span>
        </div>
        
        {/* Navigation separator */}
        <div data-webtui-nav="separator" style={{
          height: '1lh',
          paddingLeft: '1ch'
        }}>
          ├{'─'.repeat(60)}
        </div>
        
        {/* Navigation links */}
        <div data-webtui-nav="links" style={{
          height: '1lh',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '2ch',
          gap: '4ch'
        }}>
          <a 
            href="/" 
            data-webtui-link="nav"
            style={{
              textDecoration: 'none',
              color: 'var(--webtui-color-text-primary)',
              padding: '0 1ch',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--webtui-color-surface-hover)';
              e.currentTarget.style.color = 'var(--webtui-color-text-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--webtui-color-text-primary)';
            }}
          >
            [HOME]
          </a>
          <a 
            href="/messages" 
            data-webtui-link="nav"
            style={{
              textDecoration: 'none',
              color: 'var(--webtui-color-text-primary)',
              padding: '0 1ch',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--webtui-color-surface-hover)';
              e.currentTarget.style.color = 'var(--webtui-color-text-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--webtui-color-text-primary)';
            }}
          >
            [MESSAGES]
          </a>
        </div>
      </div>
      
      {/* Right border continuation */}
      <div data-webtui-border="nav-right" style={{
        width: '1ch',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div>│</div>
        <div>│</div>
        <div>│</div>
      </div>
    </nav>
  );
}