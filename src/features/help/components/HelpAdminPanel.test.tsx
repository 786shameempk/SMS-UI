import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { aiHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import HelpHomePage from "../pages/HelpHomePage";
import HelpAdminPanel from "./HelpAdminPanel";

vi.mock("virtual:help-catalog", async () => ({ default: (await import("../testCatalog")).TEST_CATALOG }));

const status = (over = {}) => ({ loaded: false, revision: null, appVersion: null, generatedOn: null, updatedAt: null, articles: 0, chunks: 0, routes: 0, tasks: 0, searchMode: "keyword", ...over });

afterEach(() => {
  signOut();
  vi.restoreAllMocks();
});

describe("HelpAdminPanel", () => {
  it("says no guide is loaded and publishes the built guide after confirmation", async () => {
    signIn("superAdmin");
    const calls = stubClient(aiHttpClient, { "GET api/ai/help/index": status(), "PUT api/ai/help/index": status({ loaded: true, revision: "r1", articles: 3, chunks: 9 }) });
    renderWithProviders(<HelpAdminPanel />);

    expect(await screen.findByText(/No guide is loaded yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Publish guide to Ask School AI" }));
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!.body as { schemaVersion: number; chunks: unknown[]; routes: unknown[] };
    expect(put.schemaVersion).toBe(1);
    expect(put.routes.length).toBeGreaterThan(0);
  });

  it("does not offer to publish when the loaded guide is already this build's", async () => {
    signIn("superAdmin");
    const { TEST_CATALOG } = await import("../testCatalog");
    stubClient(aiHttpClient, { "GET api/ai/help/index": status({ loaded: true, revision: TEST_CATALOG.revision, articles: 1, chunks: 1 }) });
    renderWithProviders(<HelpAdminPanel />);

    expect(await screen.findByText(/They match/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish guide to Ask School AI" })).toBeDisabled();
  });

  it("is shown on the Help Center home only to the platform administrator", async () => {
    signIn("admin");
    stubClient(aiHttpClient, { "GET api/ai/help/index": status() });
    const first = renderWithProviders(<HelpHomePage />, { route: "/help" });
    expect(await screen.findByRole("heading", { name: "Help Center" })).toBeInTheDocument();
    expect(screen.queryByText("Ask School AI guide")).not.toBeInTheDocument();
    first.unmount();
    signOut();

    signIn("superAdmin");
    renderWithProviders(<HelpHomePage />, { route: "/help" });
    expect(await screen.findByText("Ask School AI guide")).toBeInTheDocument();
  });
});
