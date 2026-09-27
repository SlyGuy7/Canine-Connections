// Session tokens issued by the backend at login (see backend/src/Security/SessionToken.php).
// The backend verifies the token on every request and takes the user's identity from it, so the
// claims decoded here are only used to decide what UI to show. They are never trusted for access.
//
// Users and admins are kept in separate slots so the admin portal and the main site can be
// logged in independently.

const USER_TOKEN_KEY  = "authToken";
const ADMIN_TOKEN_KEY = "adminAuthToken";

export const ADMIN_ROLES = ["super_admin", "shelter_admin"];

// Decodes the token payload without verifying it (only the server can verify).
export function readClaims(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const b64 = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")));
  } catch {
    return null;
  }
}

function isLive(claims) {
  return !!claims && typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
}

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setUserToken(token)  { localStorage.setItem(USER_TOKEN_KEY, token); }
export function setAdminToken(token) { localStorage.setItem(ADMIN_TOKEN_KEY, token); }

// Keys that survive logout: UI preferences and caches that hold no personal data.
const KEEP_ON_LOGOUT = new Set(["canine_theme", "shelter_geocache", ADMIN_TOKEN_KEY,
  "adminRole", "adminUserId", "adminEmail", "adminFirstName"]);

// Logs the user out of the main site: drops the token and every cached piece of their data.
export function clearUserSession() {
  Object.keys(localStorage).forEach(k => { if (!KEEP_ON_LOGOUT.has(k)) localStorage.removeItem(k); });
}

export function clearAdminSession() {
  [ADMIN_TOKEN_KEY, "adminRole", "adminUserId", "adminEmail", "adminFirstName"]
    .forEach(k => localStorage.removeItem(k));
}

export function hasUserSession() {
  return isLive(readClaims(read(USER_TOKEN_KEY)));
}

export function hasAdminSession() {
  const claims = readClaims(read(ADMIN_TOKEN_KEY));
  return isLive(claims) && ADMIN_ROLES.includes(claims.role);
}

// Admin pages authenticate with the admin token; everything else with the user token.
export function isAdminPath(pathname = window.location.pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function tokenForCurrentPage() {
  return read(isAdminPath() ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY);
}
