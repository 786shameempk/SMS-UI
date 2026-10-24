import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { financeHttpClient } from "@/lib/httpClient";
import { apiError, renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import PaymentGatewaysTab from "./PaymentGatewaysTab";

const gateway = (provider: string, displayName: string, overrides: Record<string, unknown> = {}) => ({
  provider, displayName, configured: false, fromPlatform: false, enabled: false, isDefault: false, mode: "Test", keyId: null, keySecretHint: null, webhookSecretHint: null,
  needsWebhookSecret: provider === "razorpay" || provider === "stripe", webhookUrl: `https://api.test/api/payments/${provider}/webhook`, lastCheckedAt: null, lastCheckResult: null,
  currencies: ["INR"], ...overrides,
});

const LIST = [
  gateway("razorpay", "Razorpay", { configured: true, enabled: true, isDefault: true, keyId: "rzp_test_1", keySecretHint: "••••1234" }),
  gateway("cashfree", "Cashfree"),
  gateway("payu", "PayU", { fromPlatform: false }),
  gateway("stripe", "Stripe"),
];

beforeEach(() => signIn("admin"));
afterEach(() => signOut());

describe("PaymentGatewaysTab", () => {
  it("shows every gateway with its state, and only hints of saved secrets", async () => {
    stubClient(financeHttpClient, { "GET /api/payments/gateways": LIST });

    renderWithProviders(<PaymentGatewaysTab />);

    expect(await screen.findByText("Cashfree")).toBeInTheDocument();
    expect(screen.getByText("Test mode")).toBeInTheDocument(); // Razorpay is on in test mode
    expect(screen.getAllByText("Not set up")).toHaveLength(3);
    expect(screen.getByText(/Saved ••••1234/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("super-secret")).not.toBeInTheDocument();
    expect(screen.getAllByText(/api\.test\/api\/payments\/.*\/webhook/)).toHaveLength(4);
  });

  it("saves a new gateway's keys, needing the secret the first time", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/payments/gateways": LIST,
      "PUT /api/payments/gateways/cashfree": gateway("cashfree", "Cashfree", { configured: true, keyId: "app-1", keySecretHint: "••••cret" }),
    });
    renderWithProviders(<PaymentGatewaysTab />);
    await screen.findByText("Cashfree");
    const card = screen.getByText("Cashfree").closest("[class*=card], div.rounded-xl, div")!.closest("div[class*=border]") as HTMLElement;

    const save = within(card).getByRole("button", { name: "Save Cashfree" });
    expect(save).toBeDisabled();
    await userEvent.type(within(card).getByLabelText(/Client \(app\) id/), "app-1");
    expect(save).toBeDisabled(); // still no secret
    await userEvent.type(within(card).getByLabelText(/Client secret/), "cf-secret");
    await userEvent.click(save);

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body).toEqual({ mode: "Test", enabled: false, isDefault: false, keyId: "app-1", keySecret: "cf-secret", webhookSecret: null });
  });

  it("explains when the person isn't a school administrator", async () => {
    stubClient(financeHttpClient, { "GET /api/payments/gateways": () => { throw apiError(403, { title: "Only school administrators can manage payment gateways." }); } });

    renderWithProviders(<PaymentGatewaysTab />);

    expect(await screen.findByText("Only school administrators can manage payment gateways.")).toBeInTheDocument();
  });
});
