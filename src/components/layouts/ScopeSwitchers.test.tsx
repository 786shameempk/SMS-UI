import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";
import { useAuthStore } from "@/store/authStore";
import { applyBrandPreset, applyDensityPreset, applyRadiusPreset } from "@/features/settings/theme";
import { renderWithProviders, signIn, testQueryClient } from "@/test/utils";

vi.mock("@/features/platform/api", () => ({
  listTenants: vi.fn(async () => [{ id: "t1", schoolName: "Green Valley" }, { id: "t2", schoolName: "Hill Top" }]),
}));
vi.mock("@/features/administration/branches/api", () => ({
  listBranches: vi.fn(async () => [{ id: "b1", name: "Main" }, { id: "b2", name: "North" }]),
}));
vi.mock("@/features/settings/api", () => ({
  getBrandPreset: vi.fn(async () => "rose"),
  getRadiusPreset: vi.fn(async () => "pill"),
  getDensityPreset: vi.fn(async () => "compact"),
}));
vi.mock("@/features/settings/theme", () => ({ applyBrandPreset: vi.fn(), applyRadiusPreset: vi.fn(), applyDensityPreset: vi.fn() }));

async function pick(trigger: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: trigger }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("scope switchers", () => {
  beforeEach(() => {
    signIn("superAdmin");
    useAuthStore.setState({ activeTenantId: "t1", activeBranchId: "b1" });
  });

  it("switching school resets every cached query and applies that school's appearance", async () => {
    const queryClient = testQueryClient();
    const reset = vi.spyOn(queryClient, "resetQueries");
    renderWithProviders(<TenantSwitcher />, { queryClient });
    expect(await screen.findByText("Green Valley")).toBeInTheDocument();

    await pick("School", "Hill Top");

    expect(useAuthStore.getState().activeTenantId).toBe("t2");
    expect(reset).toHaveBeenCalled();
    await waitFor(() => expect(applyDensityPreset).toHaveBeenCalledWith("compact"));
    expect(applyBrandPreset).toHaveBeenCalledWith("rose");
    expect(applyRadiusPreset).toHaveBeenCalledWith("pill");
  });

  it("re-selecting the current school does nothing", async () => {
    const queryClient = testQueryClient();
    const reset = vi.spyOn(queryClient, "resetQueries");
    renderWithProviders(<TenantSwitcher />, { queryClient });
    await screen.findByText("Green Valley");

    await pick("School", "Green Valley");

    expect(reset).not.toHaveBeenCalled();
    expect(applyBrandPreset).not.toHaveBeenCalled();
  });

  it("switching branch resets cached data for the new branch", async () => {
    const queryClient = testQueryClient();
    const reset = vi.spyOn(queryClient, "resetQueries");
    renderWithProviders(<BranchSwitcher />, { queryClient });
    expect(await screen.findByText("Main")).toBeInTheDocument();

    await pick("Branch", "North");

    expect(useAuthStore.getState().activeBranchId).toBe("b2");
    expect(reset).toHaveBeenCalledTimes(1);

    await pick("Branch", "North");
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
