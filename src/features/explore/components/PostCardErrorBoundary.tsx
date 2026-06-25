'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  postId: string;
}

interface State {
  hasError: boolean;
}

export class PostCardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-b border-border px-4 py-3 text-xs text-foreground/40">
          Failed to render post
        </div>
      );
    }
    return this.props.children;
  }
}
