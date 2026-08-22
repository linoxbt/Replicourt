import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// A synchronous render-time exception anywhere in the tree previously crashed to
// React's blank white screen with no recovery UI. This catches it and offers a
// reload instead — the one thing a plain try/catch in a component can't do, since
// React error boundaries must be class components.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RepliCourt] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center"
          style={{ color: "var(--color-fg-default)" }}
        >
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--color-accent-emphasis)" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
