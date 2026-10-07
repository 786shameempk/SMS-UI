import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient } from "@/lib/httpClient";
import { apiError, renderWithProviders } from "@/test/utils";
import PeriodsTab from "./PeriodsTab";

const apiSetup = {
  periods: [
    { periodNumber: 1, label: "Lesson 1", startTime: "09:00", endTime: "09:45", isBreak: false },
    { periodNumber: 2, label: "Break", startTime: "09:45", endTime: "10:00", isBreak: true },
  ],
  workingDays: [0, 1, 2, 3, 4],
  isCustom: true,
};

function stubServer(put = vi.fn(async (_url: string, body: unknown) => ({ data: { ...apiSetup, ...(body as object) } }))) {
  vi.spyOn(academicHttpClient, "get").mockResolvedValue({ data: apiSetup });
  vi.spyOn(academicHttpClient, "put").mockImplementation(put as never);
  return put;
}

afterEach(() => vi.restoreAllMocks());

describe("PeriodsTab", () => {
  it("shows the branch's periods and school days", async () => {
    stubServer();
    renderWithProviders(<PeriodsTab />);

    expect(await screen.findByDisplayValue("Lesson 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Break")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Saturday" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Save periods" })).toBeDisabled();
  });

  it("saves edits: a renamed period, a new one, and a changed school week", async () => {
    const put = stubServer();
    const user = userEvent.setup();
    renderWithProviders(<PeriodsTab />);

    const name = await screen.findByDisplayValue("Lesson 1");
    await user.clear(name);
    await user.type(name, "Maths block");
    await user.click(screen.getByRole("button", { name: /add period or break/i }));
    await user.click(screen.getByRole("button", { name: "Saturday" }));
    await user.click(screen.getByRole("button", { name: "Save periods" }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const body = put.mock.calls[0][1] as { periods: { periodNumber: number; label: string; startTime: string; endTime: string }[]; workingDays: number[] };
    expect(body.workingDays).toEqual([0, 1, 2, 3, 4, 5]);
    expect(body.periods.map((p) => [p.periodNumber, p.label])).toEqual([[1, "Maths block"], [2, "Break"], [3, "Period 2"]]);
    // The new period starts when the last one ended, and takes the next free number.
    expect(body.periods[2]).toMatchObject({ startTime: "10:00", endTime: "10:40" });
  });

  it("explains what's wrong instead of saving", async () => {
    const put = stubServer();
    const user = userEvent.setup();
    renderWithProviders(<PeriodsTab />);

    await user.click(await screen.findByRole("button", { name: "Monday" }));
    await user.click(screen.getByRole("button", { name: "Tuesday" }));
    await user.click(screen.getByRole("button", { name: "Wednesday" }));
    await user.click(screen.getByRole("button", { name: "Thursday" }));
    await user.click(screen.getByRole("button", { name: "Friday" }));
    await user.click(screen.getByRole("button", { name: "Save periods" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose at least one school day.");
    expect(put).not.toHaveBeenCalled();
  });

  it("shows the server's reason when a save is refused with a 409", async () => {
    const reason = "These periods still have lessons or substitutions and can't be removed: Break. Clear them from the timetable first.";
    stubServer(vi.fn(async () => Promise.reject(apiError(409, { title: reason }))));
    const user = userEvent.setup();
    renderWithProviders(<PeriodsTab />);

    await user.click(await screen.findByRole("button", { name: "Remove Break" }));
    await user.click(screen.getByRole("button", { name: "Save periods" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(reason);

    // Editing again clears it, so a stale refusal doesn't linger.
    await user.click(screen.getByRole("button", { name: "Saturday" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("discarding changes also clears the server's refusal", async () => {
    stubServer(vi.fn(async () => Promise.reject(apiError(409, { title: "Still has lessons." }))));
    const user = userEvent.setup();
    renderWithProviders(<PeriodsTab />);

    await user.click(await screen.findByRole("button", { name: "Remove Break" }));
    await user.click(screen.getByRole("button", { name: "Save periods" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Still has lessons.");

    await user.click(screen.getByRole("button", { name: /discard changes/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Break")).toBeInTheDocument();
  });

  it("can discard changes", async () => {
    stubServer();
    const user = userEvent.setup();
    renderWithProviders(<PeriodsTab />);

    const name = await screen.findByDisplayValue("Lesson 1");
    await user.type(name, " extra");
    await user.click(screen.getByRole("button", { name: /discard changes/i }));

    expect(await screen.findByDisplayValue("Lesson 1")).toBeInTheDocument();
  });
});
