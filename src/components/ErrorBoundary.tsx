import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { GoldMark } from './ui/bits';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-red-300">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
            >
              Go home
            </a>
          </div>
          <div className="mt-12 opacity-40">
            <GoldMark size={26} />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
