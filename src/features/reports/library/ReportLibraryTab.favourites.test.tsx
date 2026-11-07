import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authHttpClient } from "@/lib/httpClient";
import { renderWithProviders, stubClient } from "@/test/utils";
import * as api from "./api";
import ReportLibraryTab from "./ReportLibraryTab";
import type { ReportDescriptor } from "./types";

vi.mock("./api", async (importOriginal) => ({ ...(await importOriginal<typeof import("./api")>()), listReportCatalog: vi.fn(), listReportFavourites: vi.fn(), addReportFavourite: vi.fn(), removeReportFavourite: vi.fn() }));

const report = (key: string, title: string): ReportDescriptor => ({
  key, title, description: `${title} description`, category: "students", categoryTitle: "Student Reports", filters: [], columns: [],
  defaultSort: "name", defaultSortDescending: false, orientation: "portrait", sensitive: false, supportsDateRange: false, service: "academic",
});

const REPORTS = [report("students.strength", "Student Strength"), report("attendance.daily", "Daily Attendance"), report("fees.collection", "Fee Collection")];

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.listReportCatalog).mockResolvedValue({ reports: REPORTS, access: {} });
  vi.mocked(api.listReportFavourites).mockResolvedValue([]);
  vi.mocked(api.addReportFavourite).mockImplementation(async (key) => [key]);
  vi.mocked(api.removeReportFavourite).mockResolvedValue([]);
});

describe("starring reports in the library", () => {
  it("offers a star on every report and points to the Favourites tab", async () => {
    renderWithProviders(<ReportLibraryTab />);

    expect(await screen.findByRole("button", { name: "Add Student Strength to favourites" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/to your favourites tab/i)).toBeInTheDocument();
  });

  it("starring saves the report and keeps the library as it was", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportLibraryTab />);

    await user.click(await screen.findByRole("button", { name: "Add Fee Collection to favourites" }));

    expect(api.addReportFavourite).toHaveBeenCalledWith("fees.collection");
    expect(await screen.findByRole("button", { name: "Remove Fee Collection from favourites" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("search")).toBeInTheDocument(); // pressing the star did not open the report
  });

  it("puts the star back when saving fails", async () => {
    vi.mocked(api.addReportFavourite).mockRejectedValue(new Error("Server down"));
    const user = userEvent.setup();
    renderWithProviders(<ReportLibraryTab />);

    await user.click(await screen.findByRole("button", { name: "Add Student Strength to favourites" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Add Student Strength to favourites" })).toHaveAttribute("aria-pressed", "false"));
  });

  it("still shows the whole library when the favourites cannot be loaded", async () => {
    vi.mocked(api.listReportFavourites).mockRejectedValue(new Error("nope"));
    renderWithProviders(<ReportLibraryTab />);

    expect(await screen.findByText("Student Strength")).toBeInTheDocument();
    expect(screen.getByText("Fee Collection")).toBeInTheDocument();
  });
});

describe("the Favourites tab", () => {
  it("lists only the starred reports, in the order they were added, skipping any no longer available", async () => {
    vi.mocked(api.listReportFavourites).mockResolvedValue(["fees.collection", "students.strength", "gone.report"]);
    renderWithProviders(<ReportLibraryTab view="favourites" />);

    expect(await screen.findByText("2 favourite reports")).toBeInTheDocument();
    const titles = screen.getAllByText(/^(Fee Collection|Student Strength|Daily Attendance)$/).map((el) => el.textContent);
    expect(titles).toEqual(["Fee Collection", "Student Strength"]);
  });

  it("removes a report from the tab when its star is turned off", async () => {
    vi.mocked(api.listReportFavourites).mockResolvedValue(["fees.collection", "students.strength"]);
    vi.mocked(api.removeReportFavourite).mockResolvedValue(["students.strength"]);
    const user = userEvent.setup();
    renderWithProviders(<ReportLibraryTab view="favourites" />);

    await user.click(await screen.findByRole("button", { name: "Remove Fee Collection from favourites" }));

    expect(api.removeReportFavourite).toHaveBeenCalledWith("fees.collection");
    await waitFor(() => expect(screen.queryByText("Fee Collection")).not.toBeInTheDocument());
    expect(screen.getByText("Student Strength")).toBeInTheDocument();
  });

  it("searches within the favourites", async () => {
    vi.mocked(api.listReportFavourites).mockResolvedValue(["fees.collection", "students.strength"]);
    const user = userEvent.setup();
    renderWithProviders(<ReportLibraryTab view="favourites" />);

    await user.type(await screen.findByRole("searchbox", { name: "Search favourite reports" }), "fee");

    expect(screen.getByText("Fee Collection")).toBeInTheDocument();
    expect(screen.queryByText("Student Strength")).not.toBeInTheDocument();
  });

  it("explains an empty list and offers a way to the library", async () => {
    const onBrowse = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ReportLibraryTab view="favourites" onBrowseLibrary={onBrowse} />);

    expect(await screen.findByText("No favourite reports yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Browse the report library" }));
    expect(onBrowse).toHaveBeenCalled();
  });
});

describe("favourites api", () => {
  it("lists, adds and removes by report key on the account endpoint", async () => {
    const actual = await vi.importActual<typeof import("./api")>("./api");
    const calls = stubClient(authHttpClient, {
      "GET /api/account/report-favourites": ["a.b"],
      "PUT /api/account/report-favourites/students.strength": ["students.strength"],
      "DELETE /api/account/report-favourites/students.strength": [],
    });

    expect(await actual.listReportFavourites()).toEqual(["a.b"]);
    expect(await actual.addReportFavourite("students.strength")).toEqual(["students.strength"]);
    expect(await actual.removeReportFavourite("students.strength")).toEqual([]);
    expect(calls).toHaveLength(3);
  });
});
