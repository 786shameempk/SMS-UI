import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/store/authStore";
import AdvertisementBanner from "./AdvertisementBanner";
import HomeAdvertisement from "./HomeAdvertisement";
import { autoCloseProblem, isSafeLink, linkProblem } from "./rules";

const api = vi.hoisted(() => ({ getCurrentAdvertisement: vi.fn() }));
vi.mock("./api", () => api);

const banner = (over: Partial<Parameters<typeof AdvertisementBanner>[0]> = {}) => (
  <AdvertisementBanner imageUrl="https://api.test/a.png" autoCloseSeconds={10} showCloseButton onClose={() => undefined} {...over} />
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the advertisement banner", () => {
  it("closes immediately from the close button, once", async () => {
    const onClose = vi.fn();
    render(banner({ onClose }));

    await userEvent.click(screen.getByRole("button", { name: "Close advertisement" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no close button when it is switched off but still closes by itself at the configured time", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(banner({ showCloseButton: false, autoCloseSeconds: 7, onClose }));

    expect(screen.queryByRole("button", { name: "Close advertisement" })).not.toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(6_900));
    expect(onClose).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(200));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(onClose).toHaveBeenCalledTimes(1);                    // never twice
  });

  it("closes at the configured time with the close button too, and not a second time after a manual close", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(banner({ autoCloseSeconds: 5, onClose }));

    act(() => screen.getByRole("button", { name: "Close advertisement" }).click());
    act(() => void vi.advanceTimersByTime(10_000));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears its timer when it is removed from the page", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const view = render(banner({ autoCloseSeconds: 30, onClose }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("links the image only for a safe https link, in a new tab, and the close button is not part of the link", () => {
    render(banner({ redirectUrl: "https://example.com/offer" }));

    const link = screen.getByRole("link", { name: "Open the advertisement link" });
    expect(link).toHaveAttribute("href", "https://example.com/offer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link).not.toContainElement(screen.getByRole("button", { name: "Close advertisement" }));
  });

  it.each([null, "", "javascript:alert(1)", "data:text/html;base64,AAAA", "http://example.com", "ftp://example.com", "intent://x#Intent;end"])("does not link the image for %s", (url) => {
    render(banner({ redirectUrl: url }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("fills a standard 4:5 frame and tells its owner when the image cannot load", () => {
    const onImageError = vi.fn();
    render(banner({ onImageError }));
    const image = screen.getByAltText("Advertisement");
    expect(image.className).toContain("aspect-[4/5]");
    expect(image.className).toContain("object-cover");

    act(() => void image.dispatchEvent(new Event("error")));

    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("advertisement")).not.toBeInTheDocument();     // nothing left behind
  });
});

describe("advertisement rules", () => {
  it.each([
    ["https://example.com/offer", true],
    ["https://a.example.com/x?y=1#z", true],
    ["http://example.com", false],
    ["javascript:alert(1)", false],
    ["JaVaScRiPt:alert(1)", false],
    ["data:text/html;base64,AAAA", false],
    ["file:///etc/passwd", false],
    ["//example.com", false],
    ["example.com", false],
    ["https://user:pw@example.com", false],
    ["https://exa mple.com", false],
    ["https://" + "a".repeat(2100) + ".com", false],
  ])("%s is %s", (url, safe) => {
    expect(isSafeLink(url)).toBe(safe);
    if (!safe) expect(linkProblem(url)).not.toBeNull();
  });

  it("allows an empty link and 3 to 120 seconds only", () => {
    expect(linkProblem("")).toBeNull();
    expect(linkProblem(null)).toBeNull();
    for (const ok of [3, 10, 120]) expect(autoCloseProblem(ok)).toBeNull();
    for (const bad of [0, 2, 121, -5, 1.5, Number.NaN]) expect(autoCloseProblem(bad)).not.toBeNull();
  });
});

describe("the home page advertisement", () => {
  const signIn = (role = "teacher") => useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@b.c", role, tenantId: "t1" } as never });
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });
  afterEach(() => useAuthStore.setState({ user: null } as never));

  const ad = { id: "ad1", imageUrl: "https://api.test/a.png", redirectUrl: null, autoCloseSeconds: 10, showCloseButton: true };

  it("shows nothing at all when no advertisement is configured", async () => {
    signIn();
    api.getCurrentAdvertisement.mockResolvedValue(null);
    const { container } = renderWithProviders(<HomeAdvertisement />);
    await act(async () => {});

    expect(container).toBeEmptyDOMElement();
    expect(api.getCurrentAdvertisement).toHaveBeenCalledWith("web");
  });

  it("shows the configured advertisement once per browser session", async () => {
    signIn();
    api.getCurrentAdvertisement.mockResolvedValue(ad);
    const first = renderWithProviders(<HomeAdvertisement />);
    expect(await screen.findByTestId("advertisement")).toBeInTheDocument();
    first.unmount();

    renderWithProviders(<HomeAdvertisement />);          // back on the home page
    await act(async () => {});

    expect(screen.queryByTestId("advertisement")).not.toBeInTheDocument();
  });

  it("does not ask for an advertisement for a platform account or before sign-in", async () => {
    signIn("superAdmin");
    renderWithProviders(<HomeAdvertisement />);
    await act(async () => {});
    expect(api.getCurrentAdvertisement).not.toHaveBeenCalled();

    useAuthStore.setState({ user: null } as never);
    renderWithProviders(<HomeAdvertisement />);
    await act(async () => {});
    expect(api.getCurrentAdvertisement).not.toHaveBeenCalled();
  });

  it("is mounted on the home dashboard and nowhere else", () => {
    const root = join(process.cwd(), "src");
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name) && /HomeAdvertisement/.test(readFileSync(path, "utf8")) && !path.includes(join("features", "advertisements"))) users.push(path.replace(root, "").replaceAll("\\", "/"));
      }
    };
    walk(root);

    expect(users).toEqual(["/features/dashboard/pages/DashboardPage.tsx"]);
  });
});
