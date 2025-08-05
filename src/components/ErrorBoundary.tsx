/**
 * ErrorBoundary component for catching and handling React component errors.
 * 
 * This component provides a fallback UI when child components throw errors,
 * preventing the entire application from crashing. It includes error reporting
 * capabilities and user-friendly error messages with WebTUI styling.
 * 
 * Features:
 * - Catches JavaScript errors in component tree
 * - Displays user-friendly error messages
 * - Logs error details for debugging
 * - Provides retry functionality
 * - Accessible error reporting with ARIA attributes
 * - Integration with WebTUI design system
 * 
 * @module ErrorBoundary
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

/**
 * Props for the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap with error boundary */
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  /** Optional callback for error reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional context name for error reporting */
  context?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * State for the ErrorBoundary component.
 */
export interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error: Error | null;
  /** Additional error information */
  errorInfo: ErrorInfo | null;
  /** Unique key to force remount on retry */
  retryCount: number;
}

/**
 * Default fallback UI component for displaying errors.
 * Provides a clean, accessible error message with retry functionality.
 * 
 * @param error - The error that occurred
 * @param errorInfo - Additional error information
 * @param retry - Function to retry rendering
 * @param context - Optional context name
 * @returns JSX element representing the error UI
 */
function DefaultErrorFallback(
  error: Error,
  errorInfo: ErrorInfo,
  retry: () => void,
  context?: string
): ReactNode {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div 
      className="p-6 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <span className="text-red-500 text-xl" aria-hidden="true">⚠️</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Something went wrong {context && `in ${context}`}
          </h3>
          <p className="text-red-700 mb-4">
            An unexpected error occurred while rendering this component. 
            The error has been logged and reported.
          </p>
          
          {isDevelopment && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded border border-red-300">
                <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                  {errorInfo.componentStack && `\n\nComponent stack:${errorInfo.componentStack}`}
                </pre>
              </div>
            </details>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={retry}
              className="wui-button wui-button-primary"
              aria-describedby="retry-help"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="wui-button wui-button-secondary"
              aria-describedby="reload-help"
            >
              Reload Page
            </button>
          </div>
          
          <div className="mt-2 text-sm text-red-600">
            <p id="retry-help" className="sr-only">
              Try again to re-render the component
            </p>
            <p id="reload-help" className="sr-only">
              Reload the entire page to reset the application state
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ErrorBoundary component that catches and handles errors in React component trees.
 * Provides fallback UI and error reporting capabilities with accessibility features.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary context="Messages Table">
 *   <MessagesTable />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  /**
   * Static method called when an error occurs during rendering.
   * Updates state to trigger fallback UI.
   * 
   * @param error - The error that occurred
   * @returns New state object
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Called after an error has been caught by the boundary.
   * Logs error details and calls optional error callback.
   * 
   * @param error - The error that occurred
   * @param errorInfo - Additional error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      context: this.props.context,
      timestamp: new Date().toISOString(),
    });

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in ErrorBoundary onError callback:', callbackError);
      }
    }
  }

  /**
   * Resets the error boundary state to retry rendering.
   * Increments retry count to force component remount.
   */
  private retry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, context, className = '' } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided, otherwise use default
      const fallbackContent = fallback 
        ? fallback(error, errorInfo, this.retry)
        : DefaultErrorFallback(error, errorInfo, this.retry, context);

      return (
        <div className={className}>
          {fallbackContent}
        </div>
      );
    }

    // Use key to force remount on retry
    return (
      <div key={this.state.retryCount} className={className}>
        {children}
      </div>
    );
  }
}

/**
 * Hook for programmatically throwing errors to test error boundaries.
 * Useful for development and testing purposes.
 * 
 * @returns Function that throws an error when called
 */
export function useThrowError(): () => void {
  return React.useCallback(() => {
    throw new Error('Test error thrown by useThrowError hook');
  }, []);
}

/**
 * Higher-order component for wrapping components with error boundary.
 * Provides a convenient way to add error handling to any component.
 * 
 * @param WrappedComponent - Component to wrap
 * @param options - Error boundary options
 * @returns Component wrapped with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...options} context={options.context || displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${displayName})`;
  
  return WithErrorBoundaryComponent;
}

export default ErrorBoundary;