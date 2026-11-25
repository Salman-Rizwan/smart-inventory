import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ROLES } from "./roles";

/** Layout route that only lets the listed roles through; others go to their own home page. */
export default function RoleRoute({ allow }) {
  const { profile } = useAuth();
  return allow.includes(profile.role) ? <Outlet /> : <Navigate to={ROLES[profile.role].home} replace />;
}
