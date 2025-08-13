import type { ReactNode } from 'react';
import { NavigationSimple } from './NavigationSimple';

/**
 * Props for the LayoutSimple component
 */
interface LayoutSimpleProps {
  /** The main content to be rendered within the layout */
  children: ReactNode;
  /** The title of the page that will be displayed in the document title */
  title?: string;
}

/**
 * Lightweight layout component without realtime SSE connections.
 * Used for settings pages and other non-realtime views for better performance.
 * Creates a full viewport terminal interface with navigation and content areas wrapped in a single bordered box.
 * Navigation items are direct children of the main box to enable proper shearing.
 * Uses WebTUI CSS utilities exclusively for consistent theming and spacing.
 *
 * @param props - The layout props
 * @param props.children - The main content to be rendered
 * @param props.title - The page title (optional)
 * @returns The terminal-style page layout with navigation and content in a single bordered container
 */
export function LayoutSimple({ children, title }: LayoutSimpleProps) {
  return (
    <div box-="square" shear-="top">
      <NavigationSimple />
      <main>{children}</main>
    </div>
  );
}
