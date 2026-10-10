import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { ALWAYS_INCLUDED_PLAN_MODULES, AVAILABLE_MODULE_LABELS, PLAN_MODULE_GROUPS } from "../constants";
import type { Plan } from "../types";
import PlanFormDialog from "./PlanFormDialog";

const plan = (over: Partial<Plan> = {}): Plan => ({
  id: "p1",
  tier: "growth",
  name: "Professional",
  monthlyPriceInr: 1000,
  maxStudents: 500,
  maxStaff: 50,
  storageGb: 20,
  includedModules: [...ALWAYS_INCLUDED_PLAN_MODULES, "Library Management", "Transport Management"],
  schoolCount: 3,
  ...over,
});

const open = (p?: Plan | null, onSubmit = vi.fn(async () => {})) =>
  renderWithProviders(<PlanFormDialog open onOpenChange={() => {}} plan={p} submitting={false} onSubmit={onSubmit} />);

describe("plan modules", () => {
  it("lists every module the platform knows, each in exactly one menu group", () => {
    const grouped = PLAN_MODULE_GROUPS.flatMap((g) => g.modules);
    expect([...grouped].sort()).toEqual([...AVAILABLE_MODULE_LABELS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(PLAN_MODULE_GROUPS.map((g) => g.title)).toContain("Campus Operations");
    expect(PLAN_MODULE_GROUPS.find((g) => g.title === "Campus Operations")!.modules).toEqual(
      expect.arrayContaining(["Library Management", "Transport Management", "Hostel Management", "Inventory Management", "Visitor Management", "Health & Medical"]),
    );
  });
});

describe("PlanFormDialog", () => {
  it("shows the modules under their menu groups and can switch a whole group on, then off", async () => {
    const user = userEvent.setup();
    open(plan({ includedModules: [...ALWAYS_INCLUDED_PLAN_MODULES] }));

    const campus = screen.getByRole("group", { name: "Campus Operations" });
    expect(within(campus).getByRole("checkbox", { name: "Hostel Management" })).not.toBeChecked();

    await user.click(within(campus).getByRole("button", { name: "Select group" }));
    for (const m of ["Library Management", "Transport Management", "Hostel Management", "Inventory Management", "Visitor Management", "Health & Medical"]) {
      expect(within(campus).getByRole("checkbox", { name: m })).toBeChecked();
    }
    await user.click(within(campus).getByRole("button", { name: "Clear group" }));
    expect(within(campus).getByRole("checkbox", { name: "Hostel Management" })).not.toBeChecked();
  });

  it("keeps the modules every school needs switched on and locked", () => {
    open(plan({ includedModules: [] }));
    for (const m of ALWAYS_INCLUDED_PLAN_MODULES) {
      expect(screen.getByRole("checkbox", { name: new RegExp(`^${m}`) })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: new RegExp(`^${m}`) })).toBeDisabled();
    }
  });

  it("tells the platform operator how many schools a change reaches, and what removing a module does", async () => {
    const user = userEvent.setup();
    open(plan());
    expect(screen.getByRole("status")).toHaveTextContent("3 schools use this plan");

    await user.click(screen.getByRole("checkbox", { name: "Transport Management" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Removing Transport Management hides it/);
    expect(screen.getByRole("status")).toHaveTextContent(/saved Roles & Permissions are kept/);
  });

  it("shows no impact note for a new plan", () => {
    open(null);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
