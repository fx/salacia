import type { ReactNode } from 'react';
import { Navigation } from './Navigation';

/**
 * Props for the Layout component
 */
interface LayoutProps {
  /** The main content to be rendered within the layout */
  children: ReactNode;
  /** The title of the page that will be displayed in the document title */
  title?: string;
}

/**
 * Main layout component that provides the overall structure for the application.
 * Creates a terminal-like interface following WebTUI patterns with semantic attributes,
 * character-based units (ch/lh), and proper CSS layers.
 * 
 * Features:
 * - Full viewport terminal-style layout
 * - WebTUI semantic attribute styling
 * - Character-based spacing and sizing
 * - Terminal box container with navigation
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @returns The page layout with terminal-style navigation and content
 */
export function Layout({ children }: Omit<LayoutProps, 'title'>) {
  return (
    <div layout-="terminal">
      <div 
        box-="square"
        layout-="terminal-content"
      >
        <Navigation />
        <main layout-="terminal-main">
          {children}
        </main>
      </div>
    </div>
  );
}