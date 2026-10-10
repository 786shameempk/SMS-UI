import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { getRoute } from "@/app/routeRegistry";
import WalkthroughHost from "./components/WalkthroughHost";
import { useTour } from "./tourStore";
import { TOURS, findTarget, getTour } from "./walkthroughs";

afterEach(() => {
  act(() => useTour.getState().stop());
  document.body.innerHTML = "";
});

describe("tours", () => {
  it("start on a screen that exists and opens directly", () => {
    for (const t of TOURS) {
      const route = getRoute(t.routeId);
      expect(route, t.id).toBeDefined();
      expect(route!.deepLink, t.id).toBe(true);
      expect(t.steps.length, t.id).toBeGreaterThan(1);
    }
  });

  it("each walk through an article that exists", async () => {
    const { buildCatalog } = await import("../../../scripts/help/lib/catalog.mjs");
    const { catalog } = await buildCatalog();
    const ids = new Set(catalog.articles.map((a: { id: string }) => a.id));
    for (const t of TOURS) expect(ids.has(t.articleId), t.id).toBe(true);
  });
});

describe("findTarget", () => {
  it("finds a button by its words, ignoring case and spacing", () => {
    document.body.innerHTML = `<button>  Register   student </button><button>Cancel</button>`;
    expect(findTarget({ kind: "button", text: "register student" })?.textContent).toContain("Register");
    expect(findTarget({ kind: "button", text: "Nope" })).toBeNull();
  });

  it("finds the control a label names, skipping the required marker", () => {
    document.body.innerHTML = `<label for="fn">First name <span>*</span></label><input id="fn" />`;
    expect(findTarget({ kind: "label", text: "First name" })?.id).toBe("fn");
  });

  it("does not find hidden controls", () => {
    document.body.innerHTML = `<div hidden><button>Register student</button></div>`;
    expect(findTarget({ kind: "button", text: "Register student" })).toBeNull();
  });
});

describe("WalkthroughHost", () => {
  it("shows the step, a hint while the control is missing, and moves with Next and Back", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/students"]}>
        <WalkthroughHost />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => useTour.getState().start("register-student"));
    expect(await screen.findByRole("dialog", { name: "Walkthrough: Register a student" })).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/step 2 of 5/)).toBeInTheDocument();
    expect(await screen.findByText(/Select Register student on the Students tab first/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(/step 1 of 5/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End walkthrough" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("never clicks anything for the person", async () => {
    const clicked = vi.fn();
    document.body.innerHTML = `<button id="reg">Register student</button>`;
    document.getElementById("reg")!.addEventListener("click", clicked);
    render(
      <MemoryRouter initialEntries={["/students"]}>
        <WalkthroughHost />
      </MemoryRouter>,
    );
    act(() => useTour.getState().start("register-student"));
    await screen.findByRole("dialog");
    expect(clicked).not.toHaveBeenCalled();
    expect(getTour("register-student")).toBeDefined();
  });
});
