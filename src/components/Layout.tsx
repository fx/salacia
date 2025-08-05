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
 * Creates a terminal-like interface with a boxed container, navigation header,
 * and main content area using WebTUI styling patterns.
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @returns The page layout with terminal-style navigation and content
 */
export function Layout({ children }: Omit<LayoutProps, 'title'>) {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      padding: '1ch', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <div 
        box-="square" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '1ch'
        }}
      >
        <Navigation />
        <main style={{ 
          flex: '1', 
          overflow: 'auto',
          marginTop: '1ch'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}