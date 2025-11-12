import React, { Component, type ReactNode } from 'react';

export interface YVPErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface YVPErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class YVPErrorBoundary extends Component<YVPErrorBoundaryProps, YVPErrorBoundaryState> {
  constructor(props: YVPErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): YVPErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError } = this.props;
    if (onError) {
      onError(error, errorInfo);
    }
    // Only log detailed errors in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error('YVP Error Boundary caught error:', error, errorInfo);
    }
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>We encountered an error while loading YouVersion Platform components.</p>
          {isDevelopment && error && (
            <details style={{ marginTop: '10px' }}>
              <summary>Error details (development only)</summary>
              <pre style={{ textAlign: 'left', overflow: 'auto' }}>{error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}
