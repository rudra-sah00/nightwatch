'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onRetry });
  return (
    <button
      ref={ref}
      type="button"
      className={`px-6 py-3 rounded-xl font-medium transition-all ${
        focused
          ? 'bg-tv-focus text-foreground scale-105'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      Try Again
    </button>
  );
}

export class TvErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    import('@/lib/analytics').then(({ reportError }) => {
      reportError(`[TV] ${error.message}`, info?.componentStack?.slice(0, 200));
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-8">
          <span className="material-symbols-outlined text-5xl text-red-400">
            error
          </span>
          <p className="text-lg text-muted-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-md">
            {this.state.error?.message}
          </p>
          <RetryButton
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
