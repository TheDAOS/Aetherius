import { Component, type ErrorInfo, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Do not log private note contents. */
  }
  render() {
    if (this.state.failed)
      return (
        <main role="alert" className="p-8">
          <h1>Aetherius could not display this view</h1>
          <p>Saved offline changes remain on this device. Reload to retry.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Aetherius
          </button>
        </main>
      );
    return this.props.children;
  }
}
