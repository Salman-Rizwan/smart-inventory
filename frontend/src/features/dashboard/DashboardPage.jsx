import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { logout } from "../auth/authService";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Smart Inventory</h1>
        <div>
          <span className="muted">{user.email}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">Dashboard (live counts arrive in M5).</p>
    </div>
  );
}
