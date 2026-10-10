import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { testQueryClient } from "@/test/utils";
import { useAskAi } from "@/features/ai/askAi";
import type { HelpReply } from "../assistant";
import { clearUnsavedEdits, trackFormEdits, type ResolvedNavigation } from "../navigation";
import { getRoute, menuPathOf } from "@/app/routeRegistry";
import HelpReplyCard from "./HelpReplyCard";

const route = getRoute("students.list")!;
const ok: Extract<ResolvedNavigation, { status: "ok" }> = { status: "ok", route, path: route.path, label: route.label, menuPath: menuPathOf(route) };
const article = { id: "students-add", title: "Add a student", module: "students" };

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderCard(reply: HelpReply, onAsk = vi.fn()) {
  render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="*" element={<><HelpReplyCard reply={reply} onAsk={onAsk} /><Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onAsk;
}

const answer: HelpReply = {
  kind: "answer",
  article,
  label: "Add a new student",
  steps: ["Open Students.", "Select Register student."],
  moreSteps: true,
  menuPath: ["Academics", "Students"],
  navigation: ok,
  action: { type: "navigate", routeId: "students.list" },
  related: [{ id: "students-guardian", title: "Add a guardian", module: "students" }],
};

beforeEach(() => {
  clearUnsavedEdits();
  useAskAi.setState({ open: true });
});

describe("HelpReplyCard", () => {
  it("shows numbered steps, the menu path and where the answer came from", () => {
    renderCard(answer);
    expect(screen.getByText("Menu:").parentElement).toHaveTextContent("Academics → Students");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent).slice(0, 2)).toEqual(["Open Students.", "Select Register student."]);
    expect(screen.getByText("There are more steps in the full guide.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the full guide/ })).toHaveAttribute("href", "/help/a/students-add");
    expect(screen.getByText(/Source: the School Sphere guide/)).toHaveTextContent("Add a student");
  });

  it("opens the screen through the router when asked, and closes the assistant panel", async () => {
    const user = userEvent.setup();
    renderCard(answer);
    await user.click(screen.getByRole("button", { name: /Open Students/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/students");
    expect(useAskAi.getState().open).toBe(false);
  });

  it("goes straight there for a navigate reply", async () => {
    renderCard({ kind: "navigate", label: "Add a new student", navigation: ok, action: { type: "navigate", routeId: "students.list" }, article });
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/students"));
  });

  describe("with unsaved edits on the page", () => {
    let stop: () => void;
    beforeEach(() => {
      stop = trackFormEdits();
      const form = document.createElement("form");
      const input = document.createElement("input");
      form.append(input);
      document.body.append(form);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    afterEach(() => {
      stop();
      document.body.innerHTML = "";
    });

    it("asks before leaving, and stays put if the reader says so", async () => {
      const user = userEvent.setup();
      renderCard({ kind: "navigate", label: "Add a new student", navigation: ok, action: { type: "navigate", routeId: "students.list" }, article });
      expect(await screen.findByRole("alertdialog", { name: "Leave this page?" })).toHaveTextContent("unsaved changes");
      expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");

      await user.click(screen.getByRole("button", { name: "Stay here" }));
      expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("leaves only after the reader confirms", async () => {
      const user = userEvent.setup();
      renderCard(answer);
      await user.click(screen.getByRole("button", { name: /Open Students/ }));
      expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
      await user.click(screen.getByRole("button", { name: /Leave and open Students/ }));
      expect(screen.getByTestId("where")).toHaveTextContent("/students");
    });
  });

  it("explains a refusal without any steps or screen", () => {
    renderCard({ kind: "denied", label: "Add a new student", message: "Students is not available to your account.", article });
    expect(screen.getByRole("status")).toHaveTextContent("I can't open Add a new student for you");
    expect(screen.getByText("Students is not available to your account.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("asks which task is meant and sends the choice back as the next question", async () => {
    const user = userEvent.setup();
    const onAsk = renderCard({ kind: "choose", question: "add", choices: [{ taskId: "create-student", label: "Add a new student", article }, { taskId: "add-guardian", label: "Add a guardian", article }] });
    await user.click(screen.getByRole("button", { name: "Add a guardian" }));
    expect(onAsk).toHaveBeenCalledWith("Add a guardian");
  });

  it("lists matching guides when it has no exact task", () => {
    renderCard({ kind: "articles", articles: [article] });
    expect(screen.getByRole("link", { name: "Add a student" })).toHaveAttribute("href", "/help/a/students-add");
    expect(screen.getByText(/can't give you exact steps/)).toBeInTheDocument();
  });
});
