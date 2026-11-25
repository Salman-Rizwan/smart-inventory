import Box from "@mui/material/Box";
import { Navigate } from "react-router-dom";
import { color, space } from "../../shared/theme/tokens";
import AccountProblem from "./AccountProblem";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, profile, profileError, loading } = useAuth();
  if (loading) {
    return (
      <Box component="p" role="status" sx={{ padding: `${space(7)} ${space(4)}`, textAlign: "center", color: color.inkMuted }}>
        Loading…
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <AccountProblem failed={profileError} />;
  return children;
}
