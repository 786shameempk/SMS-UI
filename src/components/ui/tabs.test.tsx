import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { useSubMenuStore } from "@/store/subMenuStore";

describe("Tabs", () => {
  it("shows a formatted count inside the tab and keeps arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="students">
        <TabsList variant="line">
          <TabsTrigger value="students" count={1248}>
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers" count={84}>
            Teachers
          </TabsTrigger>
          <TabsTrigger value="archived" disabled>
            Archived
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students">Student list</TabsContent>
        <TabsContent value="teachers">Teacher list</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: /Students/ })).toHaveTextContent("1,248");
    await user.click(screen.getByRole("tab", { name: /Students/ }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Teachers/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Teacher list")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Archived" })).toBeDisabled();
  });
});

const Strip = ({ variant = "line", defaultValue = "students" }: { variant?: "line" | "pill"; defaultValue?: string }) => (
  <Tabs defaultValue={defaultValue}>
    <TabsList variant={variant}>
      <TabsTrigger value="students">Students</TabsTrigger>
      <TabsTrigger value="admissions">Admissions</TabsTrigger>
      <TabsTrigger value="promotion">Promotion</TabsTrigger>
    </TabsList>
    <TabsContent value="students">students panel</TabsContent>
    <TabsContent value="admissions">admissions panel</TabsContent>
    <TabsContent value="promotion">promotion panel</TabsContent>
  </Tabs>
);

const hide = (...keys: string[]) => act(() => useSubMenuStore.getState().setHidden(keys));

describe("Tabs sub-menu filtering", () => {
  beforeEach(() => window.history.pushState({}, "", "/students"));
  afterEach(() => act(() => useSubMenuStore.getState().clear()));

  it("shows every tab when nothing is hidden", () => {
    render(<Strip />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Students", "Admissions", "Promotion"]);
  });

  it("drops a tab the school hides for the page's route", () => {
    hide("students.list:admissions");
    render(<Strip />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Students", "Promotion"]);
  });

  it("only hides tabs of that route, not the same tab name on another page", () => {
    hide("fees.home:admissions");
    render(<Strip />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("falls back to the first remaining tab when the page's default tab is hidden", async () => {
    hide("students.list:students");
    render(<Strip />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Admissions", "Promotion"]);
    expect(await screen.findByText("admissions panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Admissions" })).toHaveAttribute("aria-selected", "true");
  });

  it("leaves small in-card switches (pill tabs) alone", () => {
    hide("students.list:admissions");
    render(<Strip variant="pill" />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("updates when the setting arrives after the page rendered", () => {
    render(<Strip />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    hide("students.list:promotion");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Students", "Admissions"]);
  });
});
