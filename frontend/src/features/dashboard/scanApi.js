import { ApiError, request } from "../../shared/api/httpClient";

export function runScan() {
  return request("/scan", { method: "POST" });
}

/** Returns an object URL for the latest annotated image, or null if no scan exists yet. */
export async function fetchLatestSnapshot() {
  try {
    const blob = await request("/snapshot/latest.jpg", { responseType: "blob" });
    return URL.createObjectURL(blob);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** User-facing message with a next step for each failure we know how to fix. */
export function scanErrorMessage(error) {
  if (!(error instanceof ApiError)) return "The scan could not be completed. Please try again.";
  switch (error.code) {
    case "network_error":
      return "Cannot reach the scanner. Make sure the backend is running on the shop laptop, then try again.";
    case "timeout":
      return "The scan took too long. Try again in a moment.";
    case "unauthorized":
      return "Your session has expired. Sign in again to continue.";
    case "camera_unavailable":
      return "The webcam is not available. Check that it is connected and that camera access is allowed, then try again.";
    default:
      return error.message || "The scan could not be completed. Please try again.";
  }
}
