import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="size-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#2D3748] mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-slate-600 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page or contact support if the problem persists.
            </p>
            {!import.meta.env.PROD && this.state.error && (
              <div className="mb-6 p-4 bg-slate-100 rounded text-left">
                <p className="text-xs font-mono text-slate-700 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                className="bg-[#E31837] hover:bg-[#C41530]"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
