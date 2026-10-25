import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import BulkImportDialog, { type ImportColumn } from "./BulkImportDialog";

const columns: ImportColumn[] = [
  { key: "name", label: "Name", required: true, example: "Asha" },
  { key: "email", label: "Email", example: "a@x.test" },
];

const csv = (rows: string[]) => new File([["Name,Email", ...rows].join("\n")], "people.csv", { type: "text/csv" });

function setup(importRow: (v: { name: string; email: string }) => Promise<unknown>) {
  const onFinished = vi.fn();
  renderWithProviders(
    <BulkImportDialog
      open
      onOpenChange={() => {}}
      title="Import people"
      description="d"
      templateFileName="people"
      columns={columns}
      parseRow={(r) => (r.email && !r.email.includes("@") ? { ok: false, error: "Email is not valid" } : { ok: true, value: { name: r.name, email: r.email } })}
      importRow={importRow}
      onFinished={onFinished}
    />,
  );
  return onFinished;
}

describe("Bulk import", () => {
  it("reports rows with problems, rows that failed on the server, and imported rows whose sign-in account needs attention", async () => {
    const importRow = vi.fn(async (v: { name: string; email: string }) => {
      if (v.name === "Dup") throw new Error("A staff member with this email already exists.");
      return v.name === "NoLogin" ? { loginIssues: ["An account with the email x@x.test already exists and cannot be linked here."] } : { loginIssues: [] };
    });
    const onFinished = setup(importRow);

    await userEvent.upload(screen.getByLabelText("CSV file"), csv(["Good,g@x.test", "NoLogin,x@x.test", "Dup,d@x.test", "Bad,not-an-email"]));
    expect(await screen.findByText("3 ready")).toBeInTheDocument();
    expect(screen.getByText("Row 5:")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Import 3 rows" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalled());
    expect(importRow).toHaveBeenCalledTimes(3);
    expect(await screen.findByText("Imported 2 rows")).toBeInTheDocument();
    expect(screen.getByText("Imported, but these sign-in accounts need attention:")).toBeInTheDocument();
    expect(screen.getByText(/cannot be linked here/)).toBeInTheDocument();
    expect(screen.getByText("A staff member with this email already exists.")).toBeInTheDocument();
    expect(screen.getByText("Email is not valid")).toBeInTheDocument();
  });

  it("shows no account warning when every sign-in account was made", async () => {
    setup(async () => ({ loginIssues: [] }));

    await userEvent.upload(screen.getByLabelText("CSV file"), csv(["Good,g@x.test"]));
    await userEvent.click(await screen.findByRole("button", { name: "Import 1 row" }));

    expect(await screen.findByText("Imported 1 row")).toBeInTheDocument();
    expect(screen.queryByText("Imported, but these sign-in accounts need attention:")).not.toBeInTheDocument();
  });
});
