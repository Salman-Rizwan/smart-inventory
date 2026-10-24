import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <p className="muted" role="status" style={{ padding: "var(--space-7) var(--space-4)", textAlign: "center" }}>
        Loading…
      </p>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}
