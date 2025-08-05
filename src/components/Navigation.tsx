/**
 * Navigation component that provides the main site navigation.
 * Creates a terminal-style header with title and navigation links using
 * WebTUI patterns and character-based sizing.
 * 
 * @returns The navigation header with terminal-style layout
 */
export function Navigation() {
  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      paddingBottom: '1lh',
      borderBottom: '1px solid var(--background2, #45475A)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2ch' }}>
        <h1 style={{ fontSize: '1em', fontWeight: 'bold' }}>Salacia</h1>
        <nav style={{ display: 'flex', gap: '2ch' }}>
          <a href="/" style={{ textDecoration: 'none' }}>Home</a>
          <a href="/messages" style={{ textDecoration: 'none' }}>Messages</a>
        </nav>
      </div>
    </header>
  );
}