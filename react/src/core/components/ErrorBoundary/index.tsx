/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from 'primereact/button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to render when an error occurs */
  fallback?: ReactNode;
  /** Custom error component to render */
  FallbackComponent?: React.ComponentType<ErrorBoundaryFallbackProps>;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show the error details in the UI (for development) */
  showErrorDetails?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  showErrorDetails?: boolean;
}

/**
 * Default Fallback Component
 */
const DefaultFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  showErrorDetails = false,
}) => {
  // Don't render error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="error-boundary-fallback">
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <div className="error-icon mb-3">
            <i className="ti ti-alert-triangle text-danger" style={{ fontSize: '4rem' }} />
          </div>
          <h3 className="mb-3">Something went wrong</h3>
          <p className="text-muted mb-4">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>

          <div className="d-flex justify-content-center gap-2">
            <Button
              label="Go to Dashboard"
              className="p-button-primary"
              onClick={() => (window.location.href = '/')}
            />
            <Button
              label="Refresh Page"
              className="p-button-secondary"
              onClick={() => window.location.reload()}
            />
          </div>

          {(showErrorDetails || isDevelopment) && error && (
            <details className="mt-4 text-start">
              <summary className="cursor-pointer text-muted">
                <i className="ti ti-code me-2" />
                Error Details (Development Only)
              </summary>
              <div className="mt-3 p-3 bg-light rounded">
                <pre className="text-danger small mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>

      <style>{`
        .error-boundary-fallback {
          padding: 2rem;
        }
        .error-icon {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

/**
 * Minimal Fallback Component (for inline errors)
 */
export const MinimalFallback: React.FC<ErrorBoundaryFallbackProps> = ({ resetError }) => (
  <div className="alert alert-danger d-flex align-items-center" role="alert">
    <i className="ti ti-alert-circle me-2 fs-4" />
    <div className="flex-grow-1">
      <strong>Error:</strong> This section could not be loaded.
    </div>
    <Button
      label="Retry"
      className="p-button-danger p-button-sm"
      onClick={resetError}
      severity="danger"
    />
  </div>
);

/**
 * Error Boundary Class Component
 *
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary
 *   FallbackComponent={CustomFallback}
 *   onError={(error, errorInfo) => console.error(error)}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);

    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Store error info in state
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error tracking service (if available)
    // Example: Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).trackError) {
      (window as any).trackError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, FallbackComponent, showErrorDetails } = this.props;

      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            showErrorDetails={showErrorDetails}
          />
        );
      }

      // Use custom fallback node if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Use default fallback component
      return (
        <DefaultFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showErrorDetails={showErrorDetails}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Hook-based error boundary for functional components
 * Note: This is for try-catch pattern, not for catching rendering errors
 *
 * @example
 * const { error, resetError } = useErrorHandler();
 * if (error) throw error; // Re-throw to let error boundary catch it
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;
