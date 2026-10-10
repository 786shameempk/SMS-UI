import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { campusHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, stubClient } from "@/test/utils";
import ActivityFormDialog from "./ActivityFormDialog";
import { ShuffleDialog } from "./GroupDialogs";
import { CancelSessionDialog } from "./SessionDialogs";
import type { Category, Group } from "../types";

const categories: Category[] = [{ id: "c1", name: "Sports and athletics", color: "#16a34a", sortOrder: 0, isActive: true, isSustainability: false, activityCount: 0 }];

function openActivityForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  renderWithProviders(<ActivityFormDialog open onOpenChange={() => undefined} activity={null} categories={categories} years={["2026-27"]} currentYear="2026-27" submitting={false} onSubmit={onSubmit} />);
  return onSubmit;
}

describe("ActivityFormDialog", () => {
  it("asks for the required fields before submitting", async () => {
    const onSubmit = openActivityForm();

    await userEvent.click(screen.getByRole("button", { name: "Create activity" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Code is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a minimum above the capacity and a grade range the wrong way round", async () => {
    const onSubmit = openActivityForm();
    await userEvent.type(screen.getByLabelText(/^Name/), "Football");
    await userEvent.type(screen.getByLabelText(/^Code/), "FB");
    await userEvent.type(screen.getByLabelText(/Capacity/), "10");
    await userEvent.type(screen.getByLabelText(/Minimum to run/), "20");
    await userEvent.type(screen.getByLabelText(/Lowest grade/), "9");
    await userEvent.type(screen.getByLabelText(/Highest grade/), "6");

    await userEvent.click(screen.getByRole("button", { name: "Create activity" }));

    expect(await screen.findByText("Cannot be more than the capacity")).toBeInTheDocument();
    expect(screen.getByText("Cannot be below the lowest grade")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits clean values, with empty optional fields as null", async () => {
    const onSubmit = openActivityForm();
    await userEvent.type(screen.getByLabelText(/^Name/), "  Football ");
    await userEvent.type(screen.getByLabelText(/^Code/), "FB-U14");
    await userEvent.type(screen.getByLabelText(/Capacity/), "22");

    await userEvent.click(screen.getByRole("button", { name: "Create activity" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Football", code: "FB-U14", categoryId: "c1", capacity: 22, minParticipants: 0, description: null, minGrade: null, enrollmentStart: null, requiresApproval: true });
  });
});

describe("CancelSessionDialog", () => {
  it("will not cancel without a reason", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const session = { id: "s1", activityId: "a1", activityName: "Football", title: "Practice", date: "2026-10-12", startTime: "16:00:00", endTime: "17:00:00", status: "Scheduled", marked: 0, expected: 0 } as never;
    renderWithProviders(<CancelSessionDialog session={session} onOpenChange={() => undefined} submitting={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel session" }));
    expect(await screen.findByText("Say why the session is cancelled")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Reason/), "Heavy rain");
    await userEvent.click(screen.getByRole("button", { name: "Cancel session" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Heavy rain"));
  });
});

describe("ShuffleDialog", () => {
  const groups: Group[] = [
    { id: "g1", name: "Red", code: "RED", color: "#ef4444", kind: "House", academicYear: "2026-27", sortOrder: 0, locked: false, memberCount: 0 },
    { id: "g2", name: "Blue", code: "BLU", color: "#3b82f6", kind: "House", academicYear: "2026-27", sortOrder: 1, locked: true, memberCount: 4 },
  ];

  it("saves nothing until the preview has been confirmed, and sends exactly the previewed moves", async () => {
    signIn("admin");
    const preview = { seed: 11, moves: [{ studentId: "s1", studentName: "Asha", className: "5A", fromGroupId: null, fromGroupName: null, toGroupId: "g1", toGroupName: "Red" }], totals: [{ groupId: "g1", groupName: "Red", before: 0, after: 1 }], lockedMembersKept: 4, unchanged: 0 };
    const calls = stubClient(campusHttpClient, {
      "POST /api/extracurricular/groups/shuffle/preview": preview,
      "POST /api/extracurricular/groups/shuffle/apply": { batchId: "b1" },
    });
    renderWithProviders(<ShuffleDialog open onOpenChange={() => undefined} groups={groups} academicYear="2026-27" kind="House" />);

    expect(screen.getByRole("button", { name: /Confirm and save/ })).toBeDisabled();
    expect(screen.getByText(/1 locked, left as they are/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Preview shuffle" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/students would move/)).toBeInTheDocument();
    expect(calls.filter((c) => c.url.endsWith("/apply"))).toHaveLength(0);
    expect(calls[0].body).toMatchObject({ groupIds: ["g1"], strategy: "ByClass", scope: "UnassignedOnly" });

    await userEvent.click(screen.getByRole("button", { name: /Confirm and save/ }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/apply"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/apply"))?.body).toMatchObject({ moves: [{ studentId: "s1", toGroupId: "g1" }] });
  });

  it("explains when every group is locked", () => {
    signIn("admin");
    stubClient(campusHttpClient, {});
    renderWithProviders(<ShuffleDialog open onOpenChange={() => undefined} groups={groups.map((g) => ({ ...g, locked: true }))} academicYear="2026-27" kind="House" />);

    expect(screen.getByText(/Every group is locked/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview shuffle" })).toBeDisabled();
  });
});
