import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not send raw component errors, wallet data or sessions to third-party telemetry.
  }

  render() {
    if (this.state.failed) return (
      <main className="fatal-error" role="alert">
        <TriangleAlert size={32} aria-hidden="true" />
        <h1>The workspace could not be displayed.</h1>
        <p>Reload the page to try again. Trading is unavailable in this preview.</p>
        <button className="button primary" onClick={() => window.location.reload()}>Reload workspace</button>
        <a className="text-link" href="/">Return to overview</a>
      </main>
    );
    return this.props.children;
  }
}
