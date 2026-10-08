import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import LeaveRequestFormDialog from "./LeaveRequestFormDialog";
import type { StaffMember } from "../types";

const staff = (id: string, firstName: string, designation = "Teacher"): StaffMember =>
  ({ id, firstName, lastName: "Menon", designation, status: "active" }) as unknown as StaffMember;

const staffList = [staff("s1", "Tara"), staff("s2", "Dev", "Accountant")];

function fill(user: ReturnType<typeof userEvent.setup>) {
  return (async () => {
    await user.type(screen.getByLabelText("From"), "2026-11-02");
    await user.type(screen.getByLabelText("To"), "2026-11-03");
    await user.type(screen.getByLabelText("Reason"), "Family function");
  })();
}

describe("LeaveRequestFormDialog", () => {
  it("fixes a teacher's request to their own staff record", async () => {
    const onSubmit = vi.fn(async (_values: unknown) => {});
    const user = userEvent.setup();
    render(<LeaveRequestFormDialog open onOpenChange={() => {}} staffList={staffList} selfOnly selfStaffId="s1" onSubmit={onSubmit} submitting={false} />);

    const who = screen.getByLabelText("Staff member");
    expect(who).toHaveValue("Tara Menon · Teacher");
    expect(who).toHaveAttribute("readonly");
    expect(screen.queryByRole("combobox", { name: /staff member/i })).not.toBeInTheDocument();

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ staffId: "s1", reason: "Family function" });
  });

  it("explains when a login has no staff record and blocks submitting", () => {
    render(<LeaveRequestFormDialog open onOpenChange={() => {}} staffList={staffList} selfOnly selfStaffId={null} onSubmit={vi.fn()} submitting={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/isn't linked to a staff record/i);
    expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
  });

  it("lets HR choose any staff member", () => {
    render(<LeaveRequestFormDialog open onOpenChange={() => {}} staffList={staffList} onSubmit={vi.fn()} submitting={false} />);

    expect(screen.getByRole("combobox", { name: /staff member/i })).toBeEnabled();
  });
});
