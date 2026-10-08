/**
 * Reads claims from an access token's payload. This only decides which screen to show: the server checks the
 * signature on every request, so nothing here is trusted for security.
 */
function readPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const payload: unknown = JSON.parse(json);
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** True when AuthService marked the account as having a temporary password (the `must_change_password` claim). */
export function mustChangePassword(token: string | null | undefined): boolean {
  if (!token) return false;
  const claim = readPayload(token)?.must_change_password;
  return claim === true || claim === "true";
}
