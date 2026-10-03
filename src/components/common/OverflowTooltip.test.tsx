import { act, fireEvent, render, screen } from "@testing-library/react";
import { OverflowTooltip } from "./OverflowTooltip";

/** jsdom has no layout and does not compute text-overflow, so report what a browser would for a `truncate` label. */
function size(el: HTMLElement, scrollWidth: number, clientWidth: number) {
  el.dataset.testEllipsis = "";
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
}

function Label({ children, ...rest }: { children: string; title?: string; "data-no-overflow-tooltip"?: boolean }) {
  return (
    <a href="#x" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} {...rest}>
      <span>{children}</span>
    </a>
  );
}

describe("OverflowTooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element) => {
      const style = real(el);
      if (!(el instanceof HTMLElement) || !("testEllipsis" in el.dataset)) return style;
      return { textOverflow: "ellipsis", overflowX: "hidden", getPropertyValue: () => "" } as unknown as CSSStyleDeclaration;
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the full text after a short delay when a label is cut off, and hides on leave", () => {
    render(
      <>
        <OverflowTooltip />
        <Label>Join live classes and parent meetings</Label>
      </>,
    );
    const link = screen.getByRole("link");
    size(link, 300, 120);

    fireEvent.pointerOver(link.firstElementChild!);
    expect(screen.queryByTestId("overflow-tooltip")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId("overflow-tooltip")).toHaveTextContent("Join live classes and parent meetings");

    fireEvent.pointerOut(link, { relatedTarget: document.body });
    expect(screen.queryByTestId("overflow-tooltip")).not.toBeInTheDocument();
  });

  it("stays quiet for labels that fit, labels with their own title, and opted-out labels", () => {
    render(
      <>
        <OverflowTooltip />
        <Label>Fits</Label>
        <Label title="Own title">Has its own title text</Label>
        <Label data-no-overflow-tooltip>Opted out of the tooltip</Label>
      </>,
    );
    const [fits, titled, optedOut] = screen.getAllByRole("link");
    size(fits, 40, 120);
    size(titled, 300, 120);
    size(optedOut, 300, 120);

    for (const el of [fits, titled, optedOut]) {
      fireEvent.pointerOver(el);
      act(() => vi.advanceTimersByTime(400));
    }
    expect(screen.queryByTestId("overflow-tooltip")).not.toBeInTheDocument();
  });

  it("ignores touch taps", () => {
    render(
      <>
        <OverflowTooltip />
        <Label>Apply for leave for a whole week</Label>
      </>,
    );
    const link = screen.getByRole("link");
    size(link, 300, 120);
    fireEvent.pointerOver(link, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByTestId("overflow-tooltip")).not.toBeInTheDocument();
  });
});
