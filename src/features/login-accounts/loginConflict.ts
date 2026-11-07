import axios from "axios";

/**
 * The server refused a new or edited staff member / teacher because of their email or mobile number: another staff member already has
 * it, or (when creating) it already belongs to a sign-in account. The form shows which field is the problem. When only the sign-in
 * account is in the way (`canSkipLogin`), the profile itself is fine and can be saved without a sign-in account.
 */
export class LoginConflictError extends Error {
  readonly fields: { email?: string; phone?: string };
  readonly canSkipLogin: boolean;

  constructor(message: string, fields: { email?: string; phone?: string }, canSkipLogin: boolean) {
    super(message);
    this.name = "LoginConflictError";
    this.fields = fields;
    this.canSkipLogin = canSkipLogin;
  }
}

/** The conflict described by a failed request, or null when the failure is anything else. */
export function loginConflictFrom(error: unknown): LoginConflictError | null {
  if (!axios.isAxiosError(error)) return null;
  const errors = (error.response?.data as { errors?: Record<string, string[]> | null } | undefined)?.errors;
  if (!errors) return null;
  const byName = new Map(Object.entries(errors).map(([key, value]) => [key.toLowerCase(), value]));
  const fields = { email: byName.get("email")?.[0], phone: byName.get("phone")?.[0] };
  if (!fields.email && !fields.phone) return null;
  return new LoginConflictError([fields.email, fields.phone].filter(Boolean).join(" "), fields, byName.has("loginaccount"));
}
