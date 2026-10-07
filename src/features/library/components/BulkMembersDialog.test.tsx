import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import type { LibraryMember } from "../types";
import BulkMembersDialog from "./BulkMembersDialog";

const student = (id: string, className: string) => ({ id, className, section: "A", status: "active" }) as Student;
const students = [student("s1", "Class 2"), student("s2", "Class 2"), student("s3", "Class 3")];
const staff = [{ id: "t1", status: "active" }, { id: "t2", status: "resigned" }] as StaffMember[];
const members = [{ id: "m1", personType: "student", personId: "s1" }] as LibraryMember[];

function setup(onSubmit = vi.fn(async () => undefined)) {
  render(<BulkMembersDialog open onOpenChange={() => undefined} students={students} staff={staff} members={members} submitting={false} onSubmit={onSubmit} />);
  return onSubmit;
}

describe("BulkMembersDialog", () => {
  it("starts empty with nothing to add", () => {
    setup();

    expect(screen.getByRole("status")).toHaveTextContent("Choose classes or staff to add.");
    expect(screen.getByRole("button", { name: "Add members" })).toBeDisabled();
  });

  it("previews who will be added and who is skipped, then submits exactly those people", async () => {
    const onSubmit = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Class 2/ }));
    await user.click(screen.getByRole("button", { name: /All current staff/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Will add 1 student and 1 staff.");
    expect(screen.getByRole("status")).toHaveTextContent("1 already a member, skipped.");

    await user.click(screen.getByRole("button", { name: "Add 2 members" }));
    expect(onSubmit).toHaveBeenCalledWith([
      { personType: "student", personId: "s2" },
      { personType: "staff", personId: "t1" },
    ]);
  });

  it("can select and clear every class", async () => {
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Select all classes" }));
    expect(screen.getByRole("status")).toHaveTextContent("Will add 2 students.");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("status")).toHaveTextContent("Choose classes or staff to add.");
  });

  it("says so when everyone chosen is already a member", async () => {
    render(<BulkMembersDialog open onOpenChange={() => undefined} students={[student("s1", "Class 2")]} staff={[]} members={members} submitting={false} onSubmit={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /Class 2/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Nobody new");
    expect(screen.getByRole("button", { name: "Add members" })).toBeDisabled();
  });
});
