import { Component } from "react";

/** Catches render errors so one broken component doesn't blank the whole app. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card login" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">Please reload the page. If it keeps happening, contact support.</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
