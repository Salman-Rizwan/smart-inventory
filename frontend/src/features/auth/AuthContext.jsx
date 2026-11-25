import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { fetchProfile } from "./profile";

const AuthContext = createContext(null);

const SIGNED_OUT = { user: null, profile: null, profileError: false, loading: false };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...SIGNED_OUT, loading: true });

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) setState(SIGNED_OUT);
        return;
      }
      if (!cancelled) setState((s) => ({ ...s, loading: true })); // hold the UI until the profile is known
      try {
        const profile = await fetchProfile(user.uid);
        if (!cancelled) setState({ user, profile, profileError: false, loading: false });
      } catch (error) {
        console.error("Could not load the user profile", error);
        if (!cancelled) setState({ user, profile: null, profileError: true, loading: false });
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
