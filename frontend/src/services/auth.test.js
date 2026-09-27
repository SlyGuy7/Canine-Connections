import { describe, expect, it } from "vitest";
import {
  clearAdminSession, clearUserSession, hasAdminSession, hasUserSession,
  isAdminPath, readClaims, setAdminToken, setUserToken, tokenForCurrentPage,
} from "./auth";

// Builds a token shaped like the backend's (the signature is only checked server-side).
const token = (claims) => `${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe("readClaims", () => {
  it("decodes the payload", () => {
    expect(readClaims(token({ uid: 5, role: "adopter" }))).toMatchObject({ uid: 5, role: "adopter" });
  });

  it.each([null, "", "no-dot", "!!!.sig", 42])("returns null for %j", (value) => {
    expect(readClaims(value)).toBeNull();
  });
});

describe("sessions", () => {
  it("treats an unexpired user token as logged in", () => {
    setUserToken(token({ uid: 5, exp: inOneHour() }));
    expect(hasUserSession()).toBe(true);
  });

  it("treats an expired token as logged out", () => {
    setUserToken(token({ uid: 5, exp: 1 }));
    expect(hasUserSession()).toBe(false);
  });

  it("needs an admin role for the admin portal", () => {
    setAdminToken(token({ uid: 5, role: "adopter", exp: inOneHour() }));
    expect(hasAdminSession()).toBe(false);

    setAdminToken(token({ uid: 2, role: "shelter_admin", exp: inOneHour() }));
    expect(hasAdminSession()).toBe(true);
  });

  it("does not count the old adminToken=true flag as a session", () => {
    localStorage.setItem("adminToken", "true");
    localStorage.setItem("adminRole", "super_admin");
    expect(hasAdminSession()).toBe(false);
  });

  it("logging out of the site keeps the admin session and preferences", () => {
    setUserToken("user-token");
    setAdminToken("admin-token");
    localStorage.setItem("userId", "5");
    localStorage.setItem("canine_theme", "dark");

    clearUserSession();

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("userId")).toBeNull();
    expect(localStorage.getItem("adminAuthToken")).toBe("admin-token");
    expect(localStorage.getItem("canine_theme")).toBe("dark");
  });

  it("logging out of the admin portal clears only admin keys", () => {
    setUserToken("user-token");
    setAdminToken("admin-token");
    localStorage.setItem("adminRole", "super_admin");

    clearAdminSession();

    expect(localStorage.getItem("adminAuthToken")).toBeNull();
    expect(localStorage.getItem("adminRole")).toBeNull();
    expect(localStorage.getItem("authToken")).toBe("user-token");
  });
});

describe("which token a page sends", () => {
  it.each([
    ["/admin", true], ["/admin/dogs", true], ["/administrator", false], ["/dashboard", false],
  ])("isAdminPath(%s) is %s", (path, expected) => {
    expect(isAdminPath(path)).toBe(expected);
  });

  it("uses the admin token on admin pages and the user token elsewhere", () => {
    setUserToken("user-token");
    setAdminToken("admin-token");

    window.history.pushState({}, "", "/admin/dogs");
    expect(tokenForCurrentPage()).toBe("admin-token");

    window.history.pushState({}, "", "/dashboard");
    expect(tokenForCurrentPage()).toBe("user-token");
  });
});
