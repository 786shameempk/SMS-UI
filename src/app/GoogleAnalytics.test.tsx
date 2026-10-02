import { render } from "@testing-library/react";
import { act } from "react";
import { createMemoryRouter } from "react-router-dom";
import { GoogleAnalytics } from "./GoogleAnalytics";

const pageViews = () =>
  (window.dataLayer ?? [])
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === "event" && args[1] === "page_view")
    .map((args) => (args[2] as { page_path: string }).page_path);

const makeRouter = () =>
  createMemoryRouter([{ path: "*", element: null }], { initialEntries: ["/dashboard"] }) as unknown as Parameters<typeof GoogleAnalytics>[0]["router"];

describe("GoogleAnalytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    delete window.dataLayer;
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
  });

  it("does nothing outside production builds", () => {
    render(<GoogleAnalytics router={makeRouter()} />);

    expect(window.gtag).toBeUndefined();
    expect(document.head.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it("loads gtag once and sends one page view per distinct URL, including the first", async () => {
    vi.stubEnv("PROD", true);
    const router = makeRouter();
    render(<GoogleAnalytics router={router} />);

    expect(document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js?id=G-H52D8T9BX8"]')).toHaveLength(1);
    await act(() => router.navigate("/ai?tab=usage"));
    await act(() => router.navigate("/ai?tab=usage"));
    await act(() => router.navigate("/examinations"));

    expect(pageViews()).toEqual(["/dashboard", "/ai?tab=usage", "/examinations"]);
    // Automatic page views are switched off so the first load is not counted twice.
    const config = (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)).find((a) => a[0] === "config");
    expect(config?.[2]).toEqual({ send_page_view: false });
  });
});
