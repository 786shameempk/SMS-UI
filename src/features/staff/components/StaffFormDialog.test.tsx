import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginConflictError } from "@/features/login-accounts/loginConflict";
import { renderWithProviders, signIn } from "@/test/utils";
import StaffFormDialog from "./StaffFormDialog";
import type { StaffFormValues } from "../types";

vi.mock("@/features/administration/branches/api", () => ({ listBranches: vi.fn(async () => [{ id: "tenant-educore-main", name: "Main" }]) }));
vi.mock("@/features/academics/api", () => ({
  listDepartments: vi.fn(async () => [{ id: "d1", name: "Science" }, { id: "d2", name: "Arts" }]),
  listReportingOptions: vi.fn(async () => []),
}));
vi.mock("../api", () => ({ listAssignableLoginRoles: vi.fn(async () => []) }));

beforeEach(() => {
  signIn("principal");
});

async function fillRequired(user: ReturnType<typeof userEvent.setup>, contact: { email?: string; phone?: string }) {
  await user.type(screen.getByLabelText(/^First name/), "Tara");
  await user.type(screen.getByLabelText(/^Last name/), "Menon");
  await user.type(screen.getByLabelText(/^Date of birth/), "1990-04-05");
  await user.type(screen.getByLabelText(/^Address/), "12 Lake Road");
  if (contact.email) await user.type(screen.getByLabelText(/^Email/), contact.email);
  if (contact.phone) await user.type(screen.getByLabelText(/^Mobile number/), contact.phone);
}

describe("StaffFormDialog contact details", () => {
  it("accepts an email only, a mobile only, both, or neither - they are all optional", async () => {
    const onSubmit = vi.fn(async (_values: StaffFormValues) => {});
    const user = userEvent.setup();
    renderWithProviders(<StaffFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} submitting={false} />);

    expect(screen.getByLabelText(/^Mobile number/)).toBeInTheDocument();
    expect(screen.getByText(/With neither, no sign-in account is created/)).toBeInTheDocument();

    await fillRequired(user, {});
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ email: "", phone: "" });
  });

  it("labels the field Role and lets departments be none or several", async () => {
    const onSubmit = vi.fn(async (_values: StaffFormValues) => {});
    const user = userEvent.setup();
    renderWithProviders(<StaffFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} submitting={false} />);

    expect(screen.getByRole("combobox", { name: /^Role/ })).toBeInTheDocument();
    await fillRequired(user, {});
    await user.click(screen.getByRole("button", { name: "Add staff member" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ designation: "Teacher", loginRole: "teacher", department: "", departments: [] });

    await user.click(await screen.findByRole("combobox", { name: /^Department/ }));
    await user.click(await screen.findByLabelText("Science"));
    await user.click(await screen.findByLabelText("Arts"));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Add staff member" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ department: "Science", departments: ["Science", "Arts"] });
  });

  it("rejects a malformed email or mobile number", async () => {
    const onSubmit = vi.fn(async (_values: StaffFormValues) => {});
    const user = userEvent.setup();
    renderWithProviders(<StaffFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} submitting={false} />);

    // "a@b" passes the browser's own email check but not ours; a 2-digit number is no mobile number.
    await fillRequired(user, { email: "a@b", phone: "12" });
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid mobile number")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("marks the taken field and offers to save without a sign-in account", async () => {
    const taken = new LoginConflictError(
      "x",
      { email: "The email address tara@school.test already has a login account, so it can't be given to this person." },
      true,
    );
    const onSubmit = vi.fn(async (values: StaffFormValues) => {
      if (!values.createWithoutLogin) throw taken;
    });
    const user = userEvent.setup();
    renderWithProviders(<StaffFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} submitting={false} />);

    await fillRequired(user, { email: "tara@school.test", phone: "9526340881" });
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    expect(await screen.findByText(/already has a login account/)).toBeInTheDocument();
    const skip = screen.getByRole("button", { name: "Save without a sign-in account" });

    await user.click(skip);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ createWithoutLogin: true, email: "tara@school.test", phone: "9526340881" });
    expect(screen.queryByRole("button", { name: "Save without a sign-in account" })).not.toBeInTheDocument();
  });

  it("shows a staff-to-staff duplicate on the field without offering to skip the login", async () => {
    const duplicate = new LoginConflictError("x", { phone: "A staff member with this mobile number already exists." }, false);
    const onSubmit = vi.fn(async (_values: StaffFormValues) => {
      throw duplicate;
    });
    const user = userEvent.setup();
    renderWithProviders(<StaffFormDialog open onOpenChange={() => {}} onSubmit={onSubmit} submitting={false} />);

    await fillRequired(user, { phone: "9526340881" });
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    expect(await screen.findByText("A staff member with this mobile number already exists.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save without a sign-in account" })).not.toBeInTheDocument();
  });
});
