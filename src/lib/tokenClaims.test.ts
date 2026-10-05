import { mustChangePassword } from "./tokenClaims";

function tokenWith(payload: unknown): string {
  // Like a real JWT: the JSON is UTF-8 bytes, then base64url.
  const encode = (value: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

describe("mustChangePassword", () => {
  it("is true when the token carries the must_change_password claim", () => {
    expect(mustChangePassword(tokenWith({ sub: "u1", must_change_password: "true" }))).toBe(true);
    expect(mustChangePassword(tokenWith({ must_change_password: true }))).toBe(true);
  });

  it("is false when the claim is missing or not true", () => {
    expect(mustChangePassword(tokenWith({ sub: "u1" }))).toBe(false);
    expect(mustChangePassword(tokenWith({ must_change_password: "false" }))).toBe(false);
  });

  it("is false for missing or unreadable tokens", () => {
    expect(mustChangePassword(null)).toBe(false);
    expect(mustChangePassword("")).toBe(false);
    expect(mustChangePassword("not-a-jwt")).toBe(false);
    expect(mustChangePassword("a.@@@.c")).toBe(false);
    expect(mustChangePassword(tokenWith("a string"))).toBe(false);
  });

  it("handles non-ASCII claims", () => {
    expect(mustChangePassword(tokenWith({ name: "Zoë", must_change_password: "true" }))).toBe(true);
  });
});
