import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../firebase";

const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

/** Maps a Firebase auth error to a message that is safe to show a user. */
export function authErrorMessage(error) {
  return MESSAGES[error?.code] ?? "Could not sign in. Please try again.";
}

export async function login(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
    return user;
  } catch (error) {
    throw new Error(authErrorMessage(error), { cause: error });
  }
}

export function logout() {
  return signOut(auth);
}
