import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import { writeCached } from "./cache";
import OfflineStatusBar from "./OfflineStatusBar";
import { enqueueRegister, listQueue, resetQueueListenersForTests, saveOperation } from "./queue";
import { resetStorageForTests } from "./storage";

let userId: string;
const entries = [{ studentId: "st1", status: "absent" as const }, { studentId: "st2", status: "present" as const }];

const queued = (overrides = {}) =>
  enqueueRegister({
    userId, tenantId: "t", branchId: "b", sectionId: "s1", date: "2026-10-23", label: "Grade 6 · A", entries, baseVersion: "t1", ...overrides,
  });

beforeEach(() => {
  resetStorageForTests();
  resetQueueListenersForTests();
  userId = signIn("teacher").id;
});
afterEach(() => signOut());

describe("OfflineStatusBar", () => {
  it("shows nothing while online with nothing saved", () => {
    const { container } = renderWithProviders(<OfflineStatusBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains being offline and lists what is waiting on the device", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await queued();

    renderWithProviders(<OfflineStatusBar />);

    expect(await screen.findByText(/You're offline/)).toBeInTheDocument();
    expect(await screen.findByText(/Grade 6 · A/)).toBeInTheDocument();
    expect(screen.getByText("Waiting to send")).toBeInTheDocument();
    expect(screen.getByText(/1 to send/)).toBeInTheDocument();
  });

  it("lets the teacher discard a register that was refused", async () => {
    stubClient(academicHttpClient, {});
    const op = await queued();
    await saveOperation({ ...op, status: "rejected", error: "Past days are locked for this branch." });

    renderWithProviders(<OfflineStatusBar />);

    expect(await screen.findByText("Not accepted")).toBeInTheDocument();
    expect(screen.getByText(/Past days are locked/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(async () => expect(await listQueue(userId)).toEqual([]));
  });

  it("shows only the students who differ in a conflict, by name from the saved roster", async () => {
    await writeCached("roster:s1", [
      { id: "st1", firstName: "Asha", lastName: "Nair" },
      { id: "st2", firstName: "Bilal", lastName: "Khan" },
    ]);
    const op = await queued();
    await saveOperation({
      ...op,
      status: "conflict",
      conflict: {
        version: "t9",
        current: [
          { id: "r1", studentId: "st1", status: "present" },
          { id: "r2", studentId: "st2", status: "present" },
        ] as never,
      },
    });

    renderWithProviders(<OfflineStatusBar />);
    await userEvent.click(await screen.findByRole("button", { name: /Review/ }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Asha Nair")).toBeInTheDocument();
    expect(within(dialog).queryByText("Bilal Khan")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Keep my version" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Use the school's version" })).toBeInTheDocument();
  });
});
