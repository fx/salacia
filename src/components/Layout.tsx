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
 * Includes the HTML document structure, navigation, and content area.
 * 
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @param props.title - Optional page title, defaults to "Salacia"
 * @returns The complete page layout with navigation and content
 */
export function Layout({ children, title = 'Salacia' }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}