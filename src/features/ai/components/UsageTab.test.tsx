import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import UsageTab from "./UsageTab";
import * as usageApi from "../usage/api";
import type { UsageSummary } from "../usage/types";

vi.mock("../usage/api", () => ({ getAiUsage: vi.fn() }));
vi.mock("@/features/administration/users/api", () => ({
  listUsers: vi.fn(async () => [{ id: "11111111-aaaa-bbbb-cccc-000000000001", name: "Daniel Reyes", email: "teacher@educore.dev" }]),
}));

const summary: UsageSummary = {
  from: "2026-09-03", to: "2026-10-02", requests: 42, failed: 2, inputTokens: 30000, outputTokens: 12000, totalTokens: 42000,
  estimatedCost: 0.27, averageDurationMs: 2400,
  byFeature: [{ key: "report-card-comment", requests: 30, tokens: 25000, cost: 0.2 }, { key: "chat", requests: 12, tokens: 17000, cost: 0.07 }],
  byModel: [], byProvider: [], byDay: [{ key: "2026-10-01", requests: 30, tokens: 25000, cost: 0.2 }], bySchool: [],
  byUser: [
    { key: "11111111-aaaa-bbbb-cccc-000000000001", requests: 30, tokens: 25000, cost: 0.2 },
    { key: "99999999-0000-0000-0000-000000000000", requests: 12, tokens: 17000, cost: 0.07 },
  ],
  limits: { dailyRequestsPerUser: 100, requestsPerMinutePerUser: 20, monthlyTokenLimitPerSchool: 50000, monthTokensUsed: 46000 },
};

describe("UsageTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows totals, the monthly allowance and usage by feature and user", async () => {
    vi.mocked(usageApi.getAiUsage).mockResolvedValue(summary);
    renderWithProviders(<UsageTab />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("2 failed")).toBeInTheDocument();
    expect(screen.getByText("$0.27")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Monthly tokens used" })).toHaveAttribute("aria-valuenow", "92");
    expect(screen.getByText(/stop at 100%/i)).toBeInTheDocument();
    expect(screen.getByText("Report card remarks")).toBeInTheDocument();
    expect(await screen.findByText("Daniel Reyes (teacher@educore.dev)")).toBeInTheDocument();
    // A user missing from the school list falls back to a short id rather than disappearing.
    expect(screen.getByText("User 99999999")).toBeInTheDocument();
  });

  it("asks for the last 30 days by default", async () => {
    vi.mocked(usageApi.getAiUsage).mockResolvedValue({ ...summary, requests: 0, byDay: [], byFeature: [], byUser: [] });
    renderWithProviders(<UsageTab />);

    expect(await screen.findByText("No AI requests in this period")).toBeInTheDocument();
    const [from, to] = vi.mocked(usageApi.getAiUsage).mock.calls[0];
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBe(29);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByText("No requests in this period.")).toHaveLength(2);
  });
});
