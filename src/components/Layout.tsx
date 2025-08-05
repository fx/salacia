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
 * Main layout component providing terminal-style ASCII box layout structure.
 * Creates a full-viewport terminal interface with ASCII box drawing characters
 * similar to Claude Code's interface aesthetic.
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @returns Terminal-style page layout with ASCII box navigation and content area
 */
export function Layout({ children }: Omit<LayoutProps, 'title'>) {
  return (
    <div data-webtui-box="terminal-layout" style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
    }}>
      {/* Terminal top border */}
      <div data-webtui-border="top" style={{
        height: '1lh',
        lineHeight: '1lh',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontSize: '1ch',
        letterSpacing: '0'
      }}>
        ╭{'─'.repeat(114)}╮
      </div>
      
      {/* Navigation area with side borders */}
      <Navigation />
      
      {/* Content area with side borders and padding */}
      <main data-webtui-content="main" style={{
        flex: '1',
        display: 'flex',
        minHeight: '0',
        overflow: 'hidden'
      }}>
        {/* Left border */}
        <div data-webtui-border="left" style={{
          width: '1ch',
          fontSize: '1ch',
          lineHeight: '1lh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ flex: '1', writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
            {'│'.repeat(50)}
          </div>
        </div>
        
        {/* Content with terminal padding */}
        <div data-webtui-content="body" style={{
          flex: '1',
          padding: '1lh 2ch',
          overflow: 'auto',
          minHeight: '0'
        }}>
          {children}
        </div>
        
        {/* Right border */}
        <div data-webtui-border="right" style={{
          width: '1ch',
          fontSize: '1ch',
          lineHeight: '1lh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ flex: '1', writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
            {'│'.repeat(50)}
          </div>
        </div>
      </main>
      
      {/* Terminal bottom border */}
      <div data-webtui-border="bottom" style={{
        height: '1lh',
        lineHeight: '1lh',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontSize: '1ch',
        letterSpacing: '0'
      }}>
        ╰{'─'.repeat(114)}╯
      </div>
    </div>
  );
}