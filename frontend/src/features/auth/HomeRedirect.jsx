import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ROLES } from "./roles";

export default function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={ROLES[profile.role].home} replace />;
}
