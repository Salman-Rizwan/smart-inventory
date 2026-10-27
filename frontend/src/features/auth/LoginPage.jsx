import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button";
import FormField from "../../shared/components/FormField";
import Logo from "../../shared/components/Logo";
import Notification from "../../shared/components/Notification";
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

  if (!loading && user) return <Navigate to="/" replace />;

  const handleChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setFormError("");
    const errors = validateLogin(values);
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      form.elements[firstInvalid]?.focus();
      return;
    }

    setBusy(true);
    try {
      await login(values.email, values.password);
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="panel auth-card">
        <div className="panel__body">
          <div className="auth-card__brand">
            <Logo />
            <span translate="no">Smart Inventory</span>
          </div>
          <h1>Sign In</h1>
          <p className="muted">Use the account your shop administrator gave you.</p>
          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              value={values.email}
              onChange={handleChange}
              error={fieldErrors.email}
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
            {formError && <Notification kind="error">{formError}</Notification>}
            <Button type="submit" block loading={busy} loadingLabel="Signing in…">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
