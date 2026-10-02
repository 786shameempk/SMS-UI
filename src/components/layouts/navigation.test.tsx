import { renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useVisibleNav } from "./useVisibleNav";
import { useMobileNav } from "./mobileNav";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";
import { useAuthStore } from "@/store/authStore";
import { allModules, renderWithProviders, signIn } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";

vi.mock("@/features/administration/branches/api", () => ({
  listBranches: vi.fn(async () => [
    { id: "tenant-educore-main", name: "Main Campus" },
    { id: "tenant-educore-manjeri", name: "Manjeri" },
  ]),
}));
vi.mock("@/features/platform/api", () => ({
  listTenants: vi.fn(async () => [
    { id: "tenant-educore", schoolName: "EduCore Academy" },
    { id: "tenant-green", schoolName: "Green Valley" },
  ]),
}));
vi.mock("@/features/settings/api", () => ({
  getBrandPreset: vi.fn(async () => "teal"),
  getRadiusPreset: vi.fn(async () => "rounded"),
  getDensityPreset: vi.fn(async () => "comfortable"),
}));
vi.mock("@/features/settings/theme", () => ({
  applyBrandPreset: vi.fn(),
  applyRadiusPreset: vi.fn(),
  applyDensityPreset: vi.fn(),
}));

const labels = (nav: ReturnType<typeof useVisibleNav>) => [
  ...nav.coreItems.map((i) => i.label),
  ...nav.sections.flatMap((s) => s.items.map((i) => i.label)),
];

function permissions(disabled: (keyof ModulePermissions)[]): ModulePermissions {
  return new Proxy({} as ModulePermissions, { get: (_t, key) => !disabled.includes(key as string) });
}

describe("useVisibleNav", () => {
  it("shows staff the authoring screens and students their own", () => {
    signIn("teacher");
    const staff = labels(renderHook(() => useVisibleNav()).result.current);
    signIn("student");
    const student = labels(renderHook(() => useVisibleNav()).result.current);

    expect(staff).toContain("Question Bank");
    expect(staff).not.toContain("My Exams");
    expect(student).toContain("My Exams");
    expect(student).not.toContain("Question Bank");
  });

  it("hides items and whole sections the role can't open", () => {
    signIn("staff", {}, permissions(["library", "administration", "platformConsole"]));
    const nav = renderHook(() => useVisibleNav()).result.current;

    expect(labels(nav)).not.toContain("Library");
    expect(labels(nav)).toContain("Transport");
    expect(nav.sections.map((s) => s.title)).not.toContain("Administration");
    expect(nav.sections.map((s) => s.title)).not.toContain("Platform");
  });

  it("drops sections left empty", () => {
    signIn("accountant", {}, permissions(["accounting"]));
    useAuthStore.setState({ modulePermissions: permissions(["library", "transport", "hostel", "inventory", "visitors", "health"]) });
    const nav = renderHook(() => useVisibleNav()).result.current;

    expect(nav.sections.map((s) => s.title)).not.toContain("Campus Operations");
  });

  it("shows everything permission-gated when permissions haven't loaded", () => {
    signIn("admin");
    useAuthStore.setState({ modulePermissions: null });

    expect(labels(renderHook(() => useVisibleNav()).result.current)).toContain("Platform Console");
  });
});

describe("useMobileNav", () => {
  it("starts closed and toggles", () => {
    expect(useMobileNav.getState().open).toBe(false);
    useMobileNav.getState().setOpen(true);
    expect(useMobileNav.getState().open).toBe(true);
    useMobileNav.getState().setOpen(false);
  });
});

describe("scope switchers", () => {
  it("switching branch updates the scope and resets every cached query", async () => {
    signIn("admin");
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<BranchSwitcher />);
    const reset = vi.spyOn(queryClient, "resetQueries");

    await user.click(await screen.findByRole("combobox", { name: "Branch" }));
    await user.click(await screen.findByRole("option", { name: "Manjeri" }));

    expect(useAuthStore.getState().activeBranchId).toBe("tenant-educore-manjeri");
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("re-selecting the active branch does nothing", async () => {
    signIn("admin");
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<BranchSwitcher />);
    const reset = vi.spyOn(queryClient, "resetQueries");

    await user.click(await screen.findByRole("combobox", { name: "Branch" }));
    await user.click(await screen.findByRole("option", { name: "Main Campus" }));

    expect(reset).not.toHaveBeenCalled();
  });

  it("switching school resets the branch, the cache and re-applies the school's theme", async () => {
    const theme = await import("@/features/settings/theme");
    signIn("superAdmin");
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<TenantSwitcher />);
    const reset = vi.spyOn(queryClient, "resetQueries");

    const trigger = await screen.findByRole("combobox", { name: "School" });
    await waitFor(() => expect(within(trigger).getByText("EduCore Academy")).toBeInTheDocument());
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Green Valley" }));

    expect([useAuthStore.getState().activeTenantId, useAuthStore.getState().activeBranchId]).toEqual(["tenant-green", "tenant-green-main"]);
    expect(reset).toHaveBeenCalled();
    await waitFor(() => expect(theme.applyBrandPreset).toHaveBeenCalledWith("teal"));
    expect(theme.applyRadiusPreset).toHaveBeenCalledWith("rounded");
    expect(theme.applyDensityPreset).toHaveBeenCalledWith("comfortable");
  });
});

void allModules;
