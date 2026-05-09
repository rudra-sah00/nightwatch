'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Feature name for Sentry context and fallback UI */
  feature: string;
  /** Render nothing instead of fallback UI (for headless providers) */
  silent?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary that catches render errors in a specific
 * domain (music, calls, player, etc.) without crashing the entire app.
 *
 * - Reports to Sentry with feature context
 * - Shows a compact inline fallback (or nothing if `silent`)
 * - Provides a retry button to re-mount the subtree
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('feature', this.props.feature);
      scope.setContext('componentStack', {
        stack: info.componentStack,
      });
      Sentry.captureException(error);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.silent) {
      return null;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-muted-foreground flex-1">
          {this.props.feature} encountered an error
        </span>
        <button
          type="button"
          onClick={this.handleReset}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }
}
