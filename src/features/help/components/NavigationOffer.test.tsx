import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NavigationOffer from "./NavigationOffer";
import { parseNavigation } from "../navigation";

vi.mock("../useViewer", () => ({
  useViewer: () => ({ role: "admin", permissions: null }),
}));

const ui = (routeId: string) => (
  <MemoryRouter>
    <NavigationOffer actions={[{ type: "navigate", routeId }]} />
  </MemoryRouter>
);

describe("parseNavigation", () => {
  it("accepts the service's nulls and keeps one offer", () => {
    const parsed = parseNavigation([
      { type: "navigate", routeId: "students.list", taskId: null, reason: null },
      { type: "navigate", routeId: "fees.list" },
    ]);
    expect(parsed).toEqual([{ type: "navigate", routeId: "students.list", taskId: undefined, reason: undefined }]);
  });

  it("drops anything that is not a navigation action", () => {
    expect(parseNavigation([{ type: "script", routeId: "x" }, "https://evil.example", null, { type: "navigate" }])).toEqual([]);
    expect(parseNavigation(undefined)).toEqual([]);
  });
});

describe("NavigationOffer", () => {
  it("shows nothing for an id that is not a registered screen", () => {
    const { container } = render(ui("https://evil.example"));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing for a screen that needs a record chosen first", () => {
    const { container } = render(ui("students.profile"));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an Open button for a registered screen the reader can open", () => {
    render(ui("students.list"));
    expect(screen.getByRole("button", { name: /^Open / })).toBeInTheDocument();
  });
});
