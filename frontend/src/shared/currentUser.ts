import { auth } from "../firebase";

/** Thrown when a write needs the signed-in user's id but the session has ended. */
export class SignedOutError extends Error {
  readonly code = "signed-out";

  constructor() {
    super("signed-out");
    this.name = "SignedOutError";
  }
}

/** The signed-in user's id, stamped on writes as "who did it" (the rules check it equals the caller). */
export function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new SignedOutError();
  return uid;
}
