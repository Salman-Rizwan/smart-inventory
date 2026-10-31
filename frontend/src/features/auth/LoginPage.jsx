import Box from "@mui/material/Box";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button";
import CardPage, { CardBrand } from "../../shared/components/CardPage";
import FormField from "../../shared/components/FormField";
import Notification from "../../shared/components/Notification";
import { space } from "../../shared/theme/tokens";
import { useAuth } from "./AuthContext";
import { login } from "./authService";
import { validateLogin } from "./validation";
import { Muted } from "../../shared/components/text";

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
    <CardPage>
      <CardBrand />
      <h1>Sign In</h1>
      <Muted>Use the account your shop administrator gave you.</Muted>
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: space(4), marginTop: space(5) }}
      >
        <FormField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          placeholder="name@example.com"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password…"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        {formError && <Notification kind="error">{formError}</Notification>}
        <Button type="submit" block loading={busy} loadingLabel="Signing in…">
          Sign In
        </Button>
      </Box>
    </CardPage>
  );
}
