import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import MyProfilePage from "./MyProfilePage";
import type { Profile, ProfileField } from "./api";

const api = vi.hoisted(() => ({ listMyProfiles: vi.fn(), saveProfile: vi.fn(), submitProfile: vi.fn(), listMyRequests: vi.fn(), cancelChange: vi.fn() }));
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

beforeEach(() => {
  vi.clearAllMocks();
  api.listMyRequests.mockResolvedValue([]);
});

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

  it("never claims the account needs a bulk import: an empty answer is a neutral message", async () => {
    api.listMyProfiles.mockResolvedValue([]);
    renderWithProviders(<MyProfilePage />);
    expect(await screen.findByText("No profile found")).toBeInTheDocument();
    expect(screen.queryByText(/bulk import/i)).not.toBeInTheDocument();
  });

  it("shows the error from the server with a retry instead of a blank page", async () => {
    api.listMyProfiles.mockRejectedValue(new Error("The service is unavailable."));
    renderWithProviders(<MyProfilePage />);
    expect(await screen.findByText("The service is unavailable.")).toBeInTheDocument();
  });
});

const approvalProfile = (over: Partial<Profile> = {}): Profile => ({
  personType: "staff", personId: "t1", displayName: "Asha Nair", subtitle: "Teacher · Science", relation: "self", status: "Approved", locked: false, submittedAt: null, version: 0, mode: "approval",
  approver: "Hari Rao (DepartmentHead)", pending: null, lastRejected: null,
  fields: [
    field({ key: "employee_id", label: "Employee ID", group: "Identity", value: "EMP-1001", editable: false, required: false }),
    field({ key: "phone", label: "Mobile number", kind: "phone", group: "Contact", value: "9876543210" }),
    field({ key: "address", label: "Address", kind: "textarea", group: "Contact", value: "1 Old Road" }),
  ],
  missingFields: [], feedback: null, ...over,
});

describe("My profile - a profile whose edits are approved", () => {
  it("is read-only until Edit profile, and shows who will review a change", async () => {
    api.listMyProfiles.mockResolvedValue([approvalProfile()]);
    renderWithProviders(<MyProfilePage />);

    expect(await screen.findByText("Asha Nair")).toBeInTheDocument();
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mobile number/)).not.toBeInTheDocument();
    expect(screen.getByText(/Hari Rao \(DepartmentHead\)/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText(/Mobile number/)).toHaveValue("9876543210");
    expect(screen.queryByLabelText(/Employee ID/)).not.toBeInTheDocument();   // read-only fields never become inputs
  });

  it("sends only what changed and leaves edit mode when it is saved", async () => {
    const waiting = approvalProfile({ pending: { id: "r1", status: "Pending", personType: "staff", personId: "t1", subjectName: "Asha Nair", subjectDetail: null, requesterName: "Asha Nair", requesterRole: null, approverName: "Hari Rao", approverRule: "DepartmentHead", submittedAt: "2026-10-27T10:00:00Z", reviewedAt: null, reviewedByName: null, reviewerComment: null, canDecide: false, changes: [{ key: "phone", label: "Mobile number", from: "9876543210", to: "9000000000", sensitive: false }] } });
    api.listMyProfiles.mockResolvedValue([approvalProfile()]);
    api.saveProfile.mockResolvedValue(waiting);
    renderWithProviders(<MyProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit profile" }));

    const phone = screen.getByLabelText(/Mobile number/);
    await userEvent.clear(phone);
    await userEvent.type(phone, "9000000000");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ personId: "t1" }), { phone: "9000000000" }));
    expect(await screen.findByText(/Waiting for Hari Rao to approve/)).toBeInTheDocument();
    expect(screen.getByText("9000000000")).toBeInTheDocument();           // the proposal, in the waiting banner
    expect(screen.getByText("Withdraw request")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("checks formats before sending, and Cancel throws the edits away", async () => {
    api.listMyProfiles.mockResolvedValue([approvalProfile()]);
    renderWithProviders(<MyProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit profile" }));

    await userEvent.clear(screen.getByLabelText(/Mobile number/));
    await userEvent.type(screen.getByLabelText(/Mobile number/), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Mobile number is not a valid phone number.")).toBeInTheDocument();
    expect(api.saveProfile).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByLabelText(/Mobile number/)).toHaveValue("9876543210");
  });

  it("keeps what was typed and shows the server's message when saving fails", async () => {
    api.listMyProfiles.mockResolvedValue([approvalProfile()]);
    api.saveProfile.mockRejectedValue(new Error("Mobile number already has a change waiting for approval."));
    renderWithProviders(<MyProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit profile" }));
    const phone = screen.getByLabelText(/Mobile number/);
    await userEvent.clear(phone);
    await userEvent.type(phone, "9000000000");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Mobile number already has a change waiting for approval.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile number/)).toHaveValue("9000000000");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("shows a rejection with the approver's reason and says nothing was changed", async () => {
    api.listMyProfiles.mockResolvedValue([approvalProfile({ lastRejected: { id: "r0", status: "Rejected", personType: "staff", personId: "t1", subjectName: "Asha Nair", subjectDetail: null, requesterName: "Asha Nair", requesterRole: null, approverName: "Hari Rao", approverRule: "DepartmentHead", submittedAt: "2026-10-26T10:00:00Z", reviewedAt: "2026-10-26T12:00:00Z", reviewedByName: "Hari Rao", reviewerComment: "That is the old office number.", canDecide: false, changes: [] } })]);
    renderWithProviders(<MyProfilePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("That is the old office number.");
    expect(screen.getByText(/profile was not changed/i)).toBeInTheDocument();
  });

  it("lets the person withdraw a waiting request", async () => {
    const waiting = approvalProfile({ pending: { id: "r1", status: "Pending", personType: "staff", personId: "t1", subjectName: "Asha Nair", subjectDetail: null, requesterName: "Asha Nair", requesterRole: null, approverName: "Hari Rao", approverRule: "DepartmentHead", submittedAt: "2026-10-27T10:00:00Z", reviewedAt: null, reviewedByName: null, reviewerComment: null, canDecide: false, changes: [{ key: "phone", label: "Mobile number", from: "9876543210", to: "9000000000", sensitive: false }] } });
    api.listMyProfiles.mockResolvedValue([waiting]);
    api.cancelChange.mockResolvedValue(undefined);
    renderWithProviders(<MyProfilePage />);

    await userEvent.click(await screen.findByRole("button", { name: "Withdraw request" }));

    await waitFor(() => expect(api.cancelChange).toHaveBeenCalledWith("r1"));
  });
});