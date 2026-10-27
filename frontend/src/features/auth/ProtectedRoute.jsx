import { Navigate } from "react-router-dom";
import AccountProblem from "./AccountProblem";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, profile, profileError, loading } = useAuth();
  if (loading) {
    return (
      <p className="muted page-status" role="status">
        Loading…
      </p>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <AccountProblem failed={profileError} />;
  return children;
}
