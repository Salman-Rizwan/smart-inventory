import Typography from "@mui/material/Typography";
import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "./Button";

interface ErrorBoundaryState {
  failed: boolean;
}

/** Catches render errors so one broken component doesn't blank the whole app. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="auth-page">
        <div className="panel auth-card" role="alert">
          <div className="panel__body">
            <h1>Something Went Wrong</h1>
            <Typography color="text.secondary" sx={{ mt: 3, mb: 6 }}>
              Reload the page to continue. If this keeps happening, contact your administrator.
            </Typography>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </main>
    );
  }
}
