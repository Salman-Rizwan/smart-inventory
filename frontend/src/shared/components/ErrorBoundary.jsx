import { Component } from "react";
import Button from "./Button";

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
      <main className="auth-page">
        <div className="panel auth-card" role="alert">
          <div className="panel__body">
            <h1>Something Went Wrong</h1>
            <p className="muted" style={{ margin: "var(--space-3) 0 var(--space-5)" }}>
              Reload the page to continue. If this keeps happening, contact your administrator.
            </p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </main>
    );
  }
}
