import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import AiSection from "./AiSection";
import { AI_SHOWCASE } from "../data";

describe("AiSection", () => {
  it("shows one AI feature at a time and switches on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSection />);

    expect(screen.getAllByRole("tab")).toHaveLength(AI_SHOWCASE.length);
    expect(screen.getByRole("tab", { name: /ask school ai/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Answers from your school's own records" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /report remarks/i }));

    expect(await screen.findByRole("heading", { name: "Report card remarks for the whole class" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "ai-tab-remarks");
  });

  it("moves between tabs with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AiSection />);

    const first = screen.getByRole("tab", { name: /ask school ai/i });
    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: /question papers/i })).toHaveFocus();
    expect(screen.getByRole("tab", { name: /question papers/i })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("tab", { name: /exam insights/i })).toHaveFocus();
    // Only the selected tab is in the tab order.
    expect(screen.getAllByRole("tab").filter((t) => t.tabIndex === 0)).toHaveLength(1);
  });

  it("states how the AI is kept safe", () => {
    renderWithProviders(<AiSection />);
    expect(screen.getByRole("list", { name: "How School AI stays safe" })).toHaveTextContent("Staff review every draft");
  });
});
