import type { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { RealtimeProvider } from '../context/realtime.js';

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
 * Creates a full viewport terminal interface with navigation and content areas wrapped in a single bordered box.
 * Navigation items are direct children of the main box to enable proper shearing.
 * Uses WebTUI CSS utilities exclusively for consistent theming and spacing.
 *
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @param props.title - The page title (optional)
 * @returns The terminal-style page layout with navigation and content in a single bordered container
 */
export function Layout({ children, title }: LayoutProps) {
  return (
    <RealtimeProvider>
      <div box-="square" shear-="top">
        <Navigation />
        <main>{children}</main>
      </div>
    </RealtimeProvider>
  );
}
