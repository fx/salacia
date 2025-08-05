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
      data-webtui-error="boundary"
      role="alert"
      aria-live="assertive"
      style={{
        padding: '2lh 3ch',
        backgroundColor: 'var(--webtui-color-error-surface)',
        border: '1px solid var(--webtui-color-error-border)',
        borderRadius: '1ch',
        fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
      }}
    >
      <div data-webtui-error="content" style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '2ch'
      }}>
        <div data-webtui-error="icon" style={{ flexShrink: 0 }}>
          <span style={{ color: 'var(--webtui-color-error)', fontSize: '2ch' }} aria-hidden="true">⚠️</span>
        </div>
        <div data-webtui-error="message" style={{ flex: 1 }}>
          <h3 data-webtui-text="error-title" style={{
            fontSize: '2ch',
            fontWeight: 'bold',
            color: 'var(--webtui-color-error-text)',
            marginBottom: '1lh'
          }}>
            ERROR {context && `IN ${context.toUpperCase()}`}
          </h3>
          <p data-webtui-text="error-desc" style={{
            color: 'var(--webtui-color-error-text)',
            marginBottom: '2lh',
            lineHeight: '1.5lh'
          }}>
            COMPONENT RENDERING FAILED - ERROR LOGGED
          </p>
          
          {isDevelopment && (
            <details data-webtui-error="details" style={{ marginBottom: '2lh' }}>
              <summary data-webtui-error="summary" style={{
                cursor: 'pointer',
                fontSize: '1ch',
                fontWeight: 'bold',
                color: 'var(--webtui-color-error-text)',
                userSelect: 'none'
              }}>
                ► ERROR DETAILS (DEV)
              </summary>
              <div data-webtui-error="stack" style={{
                marginTop: '1lh',
                padding: '1lh 2ch',
                backgroundColor: 'var(--webtui-color-error-surface-dim)',
                border: '1px solid var(--webtui-color-error-border)',
                borderRadius: '1ch'
              }}>
                <pre data-webtui-text="mono" style={{
                  fontSize: '1ch',
                  color: 'var(--webtui-color-error-text)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace',
                  lineHeight: '1.2lh',
                  margin: 0
                }}>
                  {error.message}
                  {error.stack && `\n\n>>> STACK TRACE:\n${error.stack}`}
                  {errorInfo.componentStack && `\n\n>>> COMPONENT STACK:${errorInfo.componentStack}`}
                </pre>
              </div>
            </details>
          )}

          <div data-webtui-error="actions" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2ch'
          }}>
            <button
              type="button"
              onClick={retry}
              data-webtui-button="error-retry"
              aria-describedby="retry-help"
              style={{
                padding: '0.5lh 2ch',
                backgroundColor: 'var(--webtui-color-error)',
                color: 'var(--webtui-color-error-contrast)',
                border: 'none',
                borderRadius: '0.5ch',
                fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace',
                fontSize: '1ch',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              [RETRY]
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              data-webtui-button="error-reload"
              aria-describedby="reload-help"
              style={{
                padding: '0.5lh 2ch',
                backgroundColor: 'transparent',
                color: 'var(--webtui-color-error)',
                border: '1px solid var(--webtui-color-error)',
                borderRadius: '0.5ch',
                fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace',
                fontSize: '1ch',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--webtui-color-error)';
                e.currentTarget.style.color = 'var(--webtui-color-error-contrast)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--webtui-color-error)';
              }}
            >
              [RELOAD]
            </button>
          </div>
          
          <div data-webtui-error="help" style={{
            marginTop: '1lh',
            fontSize: '1ch',
            color: 'var(--webtui-color-error-text-dim)'
          }}>
            <p id="retry-help" style={{ position: 'absolute', left: '-10000px' }}>
              Try again to re-render the component
            </p>
            <p id="reload-help" style={{ position: 'absolute', left: '-10000px' }}>
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
    const { children, fallback, context } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided, otherwise use default
      const fallbackContent = fallback 
        ? fallback(error, errorInfo, this.retry)
        : DefaultErrorFallback(error, errorInfo, this.retry, context);

      return (
        <div data-webtui-error="wrapper" style={{
          fontFamily: '"Hack Nerd Font", "Hack", "Symbols Nerd Font", monospace'
        }}>
          {fallbackContent}
        </div>
      );
    }

    // Use key to force remount on retry
    return (
      <div key={this.state.retryCount} data-webtui-boundary="container">
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