import { describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: vi.fn(), signOut: vi.fn() }));

import { signInWithEmailAndPassword } from "firebase/auth";
import { authErrorMessage, login } from "./authService";

describe("authErrorMessage", () => {
  it.each(["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"])(
    "does not reveal whether the account exists (%s)",
    (code) => expect(authErrorMessage({ code })).toBe("Incorrect email or password."),
  );

  it("explains rate limiting and network failures", () => {
    expect(authErrorMessage({ code: "auth/too-many-requests" })).toMatch(/Too many attempts/);
    expect(authErrorMessage({ code: "auth/network-request-failed" })).toMatch(/Network error/);
  });

  it("falls back to a generic message and never leaks raw errors", () => {
    expect(authErrorMessage({ code: "auth/internal-error", message: "secret detail" })).toBe(
      "Could not sign in. Please try again.",
    );
    expect(authErrorMessage(undefined)).toBe("Could not sign in. Please try again.");
  });
});

describe("login", () => {
  it("trims the email and returns the user", async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "u1" } });
    await expect(login(" a@b.co ", "pw1234")).resolves.toEqual({ uid: "u1" });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, "a@b.co", "pw1234");
  });

  it("throws a user-safe message on failure", async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    await expect(login("a@b.co", "bad")).rejects.toThrow("Incorrect email or password.");
  });
});
