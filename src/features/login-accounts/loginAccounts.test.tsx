import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authHttpClient } from "@/lib/httpClient";
import { apiError, renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import { getLoginAccountStatuses } from "./api";
import LoginAccountBadge from "./LoginAccountBadge";
import { matchesLoginFilter } from "./LoginAccountFilter";
import { loginConflictFrom, LoginConflictError } from "./loginConflict";
import { canResetPassword, ResetPasswordMenuItem, useResetPasswordDialog } from "./ResetPasswordAction";

beforeEach(() => signOut());

describe("LoginAccountBadge", () => {
  it("says whether a sign-in account is linked", () => {
    const { rerender } = render(<LoginAccountBadge linked />);
    expect(screen.getByText("Account linked")).toBeInTheDocument();
    rerender(<LoginAccountBadge linked={false} />);
    expect(screen.getByText("Not linked")).toBeInTheDocument();
  });
});

describe("matchesLoginFilter", () => {
  it("keeps everyone, only the linked, or only the not linked", () => {
    expect([true, false].filter((linked) => matchesLoginFilter(linked, "all"))).toEqual([true, false]);
    expect([true, false].filter((linked) => matchesLoginFilter(linked, "linked"))).toEqual([true]);
    expect([true, false].filter((linked) => matchesLoginFilter(linked, "not-linked"))).toEqual([false]);
  });
});

describe("canResetPassword", () => {
  it("is only true for a linked account that has an email", () => {
    expect(canResetPassword("u1", { userId: "u1", hasEmail: true, hasMobile: false })).toBe(true);
    expect(canResetPassword("u1", { userId: "u1", hasEmail: true, hasMobile: true })).toBe(true);
    expect(canResetPassword("u1", { userId: "u1", hasEmail: false, hasMobile: true })).toBe(false); // mobile only
    expect(canResetPassword(undefined, { userId: "u1", hasEmail: true, hasMobile: false })).toBe(false); // no linked account
    expect(canResetPassword("u1", undefined)).toBe(false); // methods unknown
  });
});

function Menu({ userId, status }: { userId?: string; status?: { userId: string; hasEmail: boolean; hasMobile: boolean } }) {
  const reset = useResetPasswordDialog();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <ResetPasswordMenuItem userId={userId} status={status} personName="Tara Menon" onRequest={reset.request} />
        </DropdownMenuContent>
      </DropdownMenu>
      {reset.dialog}
    </>
  );
}

describe("ResetPasswordMenuItem", () => {
  const emailAccount = { userId: "u1", hasEmail: true, hasMobile: false };

  it("is offered for a linked email account and resets after confirming", async () => {
    signIn("admin");
    const calls = stubClient(authHttpClient, { "POST /api/school-users/u1/reset-password": {} });
    const user = userEvent.setup();
    renderWithProviders(<Menu userId="u1" status={emailAccount} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Reset password" }));
    await user.click(await screen.findByRole("button", { name: "Reset password" }));

    await waitFor(() => expect(calls.some((c) => c.url === "/api/school-users/u1/reset-password")).toBe(true));
  });

  it.each([
    ["a mobile-only account", "u1", { userId: "u1", hasEmail: false, hasMobile: true }],
    ["a profile with no linked account", undefined, undefined],
    ["an account whose sign-in methods are unknown", "u1", undefined],
  ])("is not offered for %s", async (_label, userId, status) => {
    signIn("admin");
    const user = userEvent.setup();
    renderWithProviders(<Menu userId={userId} status={status} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.queryByRole("menuitem", { name: "Reset password" })).not.toBeInTheDocument();
  });

  it("is not offered to a user who may not reset passwords", async () => {
    signIn("teacher");
    const user = userEvent.setup();
    renderWithProviders(<Menu userId="u1" status={emailAccount} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.queryByRole("menuitem", { name: "Reset password" })).not.toBeInTheDocument();
  });
});

describe("getLoginAccountStatuses", () => {
  it("asks once for the distinct accounts of a page", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/person-logins/status": [{ userId: "u1", hasEmail: true, hasMobile: false }],
    });

    const rows = await getLoginAccountStatuses(["u1", "u1", "u2"]);

    expect(rows).toEqual([{ userId: "u1", hasEmail: true, hasMobile: false }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ userIds: ["u1", "u2"] });
  });
});

describe("loginConflictFrom", () => {
  it("reads which field is taken and whether the login can be skipped", () => {
    const refused = apiError(400, {
      title: "One or more validation errors occurred.",
      errors: {
        Email: ["The email address a@x.test already has a login account."],
        Phone: ["The mobile number +91*****881 already has a login account."],
        LoginAccount: ["The person can still be saved without a login account."],
      },
    });

    const conflict = loginConflictFrom(refused);

    expect(conflict).toBeInstanceOf(LoginConflictError);
    expect(conflict?.fields).toEqual({
      email: "The email address a@x.test already has a login account.",
      phone: "The mobile number +91*****881 already has a login account.",
    });
    expect(conflict?.canSkipLogin).toBe(true);
  });

  it("treats a staff-to-staff duplicate as not skippable and ignores other failures", () => {
    const duplicate = loginConflictFrom(apiError(400, { errors: { Email: ["A staff member with this email already exists."] } }));
    expect(duplicate?.canSkipLogin).toBe(false);
    expect(loginConflictFrom(apiError(400, { errors: { FirstName: ["required"] } }))).toBeNull();
    expect(loginConflictFrom(apiError(500, { title: "boom" }))).toBeNull();
    expect(loginConflictFrom(new Error("plain"))).toBeNull();
  });
});
