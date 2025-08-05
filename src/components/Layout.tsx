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
 * Main layout component that provides the overall terminal-like structure for the application.
 * Creates a full viewport terminal interface with navigation and content areas.
 * Uses WebTUI CSS utilities exclusively for consistent theming and spacing.
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @returns The terminal-style page layout with navigation and content
 */
export function Layout({ children }: Omit<LayoutProps, 'title'>) {
  return (
    <div className="w-full h-screen flex flex-col bg-surface text-foreground overflow-hidden">
      <Navigation />
      <main className="flex-1 p-4 overflow-auto">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}