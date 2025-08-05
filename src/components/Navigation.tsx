/**
 * Navigation component that provides the main site navigation.
 * Includes navigation links for Home and Messages pages, with active state
 * indication and responsive design.
 * 
 * @returns The navigation bar with primary site links
 */
export function Navigation() {
  return (
    <nav className="bg-surface border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-foreground">Salacia</h1>
            </div>
            <div className="flex space-x-6">
              <a 
                href="/" 
                className="text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </a>
              <a 
                href="/messages" 
                className="text-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Messages
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}