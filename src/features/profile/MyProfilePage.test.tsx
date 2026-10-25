import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import MyProfilePage from "./MyProfilePage";
import type { Profile, ProfileField } from "./api";

const api = vi.hoisted(() => ({ listMyProfiles: vi.fn(), saveProfile: vi.fn(), submitProfile: vi.fn() }));
vi.mock("./api", () => api);

const field = (over: Partial<ProfileField>): ProfileField => ({
  key: "x", label: "X", group: "Contact", kind: "text", value: "", editable: true, sensitive: false, required: true, missing: false, options: null, ...over,
});

const profile = (over: Partial<Profile> = {}): Profile => ({
  personType: "student", personId: "s1", displayName: "Ravi Kumar", subtitle: "Grade 1 · A", relation: "child", status: "Incomplete", locked: false, submittedAt: null, version: 0,
  fields: [
    field({ key: "admission_number", label: "Admission number", group: "Identity", value: "A1", editable: false, required: false }),
    field({ key: "address", label: "Home address", kind: "textarea", value: "Not provided", missing: true }),
    field({ key: "blood_group", label: "Blood group", kind: "select", value: "unknown", missing: true, options: ["A+", "O+", "unknown"], group: "Health" }),
    field({ key: "first_name", label: "First name", value: "Ravi", sensitive: true, group: "Personal" }),
  ],
  missingFields: ["address", "blood_group"], feedback: null, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("My profile", () => {
  it("shows an imported child with read-only identifiers and the missing details as empty boxes", async () => {
    api.listMyProfiles.mockResolvedValue([profile()]);
    renderWithProviders(<MyProfilePage />);

    expect(await screen.findByText("Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByText(/Your child/)).toBeInTheDocument();
    expect(screen.getByText("A1").tagName).toBe("P");
    expect(screen.getByLabelText(/Home address/)).toHaveValue("");
    expect(screen.getByText(/Still needed/)).toHaveTextContent("Home address, Blood group");
  });

  it("saves only what changed, and sending for approval waits for the missing details and unsaved edits", async () => {
    api.listMyProfiles.mockResolvedValue([profile()]);
    api.saveProfile.mockResolvedValue(profile({ fields: profile().fields.map((f) => (f.key === "address" ? { ...f, value: "12 Lake Road", missing: false } : f)), missingFields: ["blood_group"] }));
    renderWithProviders(<MyProfilePage />);
    const send = await screen.findByRole("button", { name: "Send for approval" });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Home address/), "12 Lake Road");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ personId: "s1" }), { address: "12 Lake Road" }));
    expect(send).toBeDisabled();
  });

  it("submits a complete profile and then shows it locked for review", async () => {
    const complete = profile({ fields: profile().fields.map((f) => ({ ...f, missing: false, value: f.key === "address" ? "12 Lake Road" : f.key === "blood_group" ? "O+" : f.value })), missingFields: [] });
    api.listMyProfiles.mockResolvedValue([complete]);
    api.submitProfile.mockResolvedValue({ ...complete, status: "PendingApproval", locked: true, fields: complete.fields.map((f) => ({ ...f, editable: false })) });
    renderWithProviders(<MyProfilePage />);

    await userEvent.click(await screen.findByRole("button", { name: "Send for approval" }));

    expect(await screen.findByText(/Sent for review/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the office's reason when changes were requested", async () => {
    api.listMyProfiles.mockResolvedValue([profile({ status: "ChangesRequested", feedback: { decision: "ChangesRequested", reason: "Add the pin code.", decidedAt: "2026-10-25T10:00:00Z", decidedBy: "Ops" } })]);
    renderWithProviders(<MyProfilePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Add the pin code.");
  });

  it("says there is nothing to complete for someone who was not imported", async () => {
    api.listMyProfiles.mockResolvedValue([]);
    renderWithProviders(<MyProfilePage />);
    expect(await screen.findByText("Nothing to complete")).toBeInTheDocument();
  });
});
