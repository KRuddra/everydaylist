"use client";

import { Component, type ReactNode } from "react";

import { EmptyState } from "@/components/shared/EmptyState";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level UI error boundary (per CLAUDE.md: "use React error boundaries
 * for UI error handling"). Wraps the authenticated app shell
 * (`app/(app)/layout.tsx`) so a render error in one screen shows a recovery
 * UI instead of a blank white page — see `docs/UI_SPEC.md`'s "no dead ends
 * offline" principle, which applies just as much to unexpected render
 * errors.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Last-resort diagnostic; no server-side logging pipeline exists yet for client render errors.
    console.error("Unhandled render error", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <EmptyState
            variant="error"
            title="Something went wrong"
            description="This screen hit an unexpected error. Your data is safe — try again."
            onRetry={this.handleRetry}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
