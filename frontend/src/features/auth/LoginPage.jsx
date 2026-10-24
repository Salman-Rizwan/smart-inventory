import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import FormField from "../../shared/components/FormField";
import { useAuth } from "./AuthContext";
import { login } from "./authService";
import { validateLogin } from "./validation";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const errors = validateLogin(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await login(values.email, values.password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card login">
      <h1>Smart Inventory</h1>
      <p className="muted">Sign in to continue</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoFocus
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
