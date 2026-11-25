const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/**
 * True when the app is opened from its web address (Firebase Hosting) rather than on the shop laptop
 * itself. The backend, the camera and the shelf image exist only on the laptop, so the hosted app
 * words their failures differently.
 */
export function isHostedOrigin(hostname: string = window.location.hostname): boolean {
  return !LOCAL_HOSTNAMES.includes(hostname);
}
