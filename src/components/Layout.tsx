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
 * Includes navigation and content area within a flex layout.
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @returns The page layout with navigation and content
 */
export function Layout({ children }: Omit<LayoutProps, 'title'>) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}