import { describe, expect, it } from "vitest";
import { validateLogin } from "./validation";

describe("validateLogin", () => {
  it("accepts a valid email and password", () => {
    expect(validateLogin({ email: "shop@example.com", password: "secret1" })).toEqual({});
  });

  it("trims surrounding whitespace in the email", () => {
    expect(validateLogin({ email: "  shop@example.com ", password: "secret1" })).toEqual({});
  });

  it("requires both fields", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Email is required.",
      password: "Password is required.",
    });
  });

  it.each(["plainaddress", "a@b", "a b@c.com", "@c.com"])("rejects malformed email %s", (email) => {
    expect(validateLogin({ email, password: "secret1" }).email).toBe("Enter a valid email address.");
  });

  it("rejects passwords shorter than 6 characters", () => {
    expect(validateLogin({ email: "a@b.co", password: "12345" }).password).toMatch(/at least 6/);
  });
});
