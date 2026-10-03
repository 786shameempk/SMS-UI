import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

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
