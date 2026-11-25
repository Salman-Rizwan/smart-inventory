import { auth } from "../../firebase";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 30000; // a scan includes camera warm-up and inference

export class ApiError extends Error {
  constructor(message, { status = 0, code = "unknown" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Calls the backend with the signed-in user's Firebase token and normalises errors. */
export async function request(path, { method = "GET", responseType = "json" } = {}) {
  const user = auth.currentUser;
  if (!user) throw new ApiError("You are signed out.", { status: 401, code: "unauthorized" });

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error.name === "AbortError";
    throw new ApiError(
      timedOut ? "The server took too long to respond." : "Cannot reach the backend. Is it running?",
      { code: timedOut ? "timeout" : "network_error" },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      code: body?.error?.code,
    });
  }
  return responseType === "blob" ? response.blob() : response.json();
}
