import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { isRole } from "./roles";

/** Validates a users/{uid} document. Returns null when the role is missing or unknown. */
export function parseProfile(data) {
  if (!data || !isRole(data.role)) return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return { name: name || "User", role: data.role };
}

/** Initials for the avatar: first letter of the first and last word, e.g. "Test Dealer" -> "TD". */
export function initials(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export async function fetchProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? parseProfile(snap.data()) : null;
}
