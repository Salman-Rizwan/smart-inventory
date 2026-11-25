const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6; // Firebase's own minimum

/** Returns an object of field errors; empty when the input is valid. */
export function validateLogin({ email, password }) {
  const errors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(trimmed)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
}
