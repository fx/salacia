/**
 * Navigation component that provides the main site navigation.
 * Creates a terminal-style header with title and navigation links using
 * WebTUI patterns with semantic attributes and character-based sizing.
 * 
 * Features:
 * - WebTUI semantic attribute styling
 * - Character-based spacing (ch/lh units)
 * - Terminal-style navigation layout
 * - Accessible navigation structure
 * 
 * @returns The navigation header with terminal-style layout
 */
export function Navigation() {
  return (
    <header is-="terminal-nav">
      <div is-="terminal-nav-brand">
        <h1 style={{ fontSize: '1em', fontWeight: 'bold', margin: 0 }}>Salacia</h1>
        <nav is-="terminal-nav-links">
          <a href="/" is-="terminal-nav-link">Home</a>
          <a href="/messages" is-="terminal-nav-link">Messages</a>
        </nav>
      </div>
    </header>
  );
}