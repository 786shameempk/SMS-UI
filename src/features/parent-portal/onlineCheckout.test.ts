import { createOnlinePaymentOrder, verifyOnlinePayment, type OnlinePaymentOrder } from "@/features/fees/api";
import { completeReturnedPayment, startOnlinePayment } from "./onlineCheckout";
import { openRazorpayCheckout } from "./razorpayCheckout";

vi.mock("@/features/fees/api", () => ({ createOnlinePaymentOrder: vi.fn(), verifyOnlinePayment: vi.fn() }));
vi.mock("./razorpayCheckout", () => ({ openRazorpayCheckout: vi.fn(), CheckoutDismissed: class extends Error {} }));

const order = (overrides: Partial<OnlinePaymentOrder> = {}): OnlinePaymentOrder => ({
  orderId: "order_1", keyId: "k", amountPaise: 250050, currency: "INR", invoiceId: "inv1", description: "Term 1 fees", provider: "razorpay", mode: "Test",
  checkoutKind: "razorpay", checkoutUrl: null, checkoutFields: null, ...overrides,
});

beforeEach(() => {
  vi.mocked(verifyOnlinePayment).mockResolvedValue({ invoice: { id: "inv1" }, receipt: null } as never);
});
afterEach(() => {
  delete window.Cashfree;
  document.body.innerHTML = "";
});

describe("startOnlinePayment", () => {
  it("Razorpay pays in a popup and is verified with its signed result", async () => {
    vi.mocked(createOnlinePaymentOrder).mockResolvedValue(order());
    vi.mocked(openRazorpayCheckout).mockResolvedValue({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" });

    const outcome = await startOnlinePayment("inv1", "razorpay", { name: "Asha", email: "a@x.test" });

    expect(createOnlinePaymentOrder).toHaveBeenCalledWith("inv1", "razorpay", { name: "Asha", email: "a@x.test" });
    expect(verifyOnlinePayment).toHaveBeenCalledWith({ provider: "razorpay", orderId: "order_1", paymentId: "pay_1", signature: "sig" });
    expect(outcome).toMatchObject({ kind: "paid", invoice: { id: "inv1" } });
  });

  it("Cashfree opens its SDK on the session and takes the page over", async () => {
    vi.mocked(createOnlinePaymentOrder).mockResolvedValue(order({ provider: "cashfree", checkoutKind: "cashfree", checkoutFields: { paymentSessionId: "sess_1", mode: "production" } }));
    const checkout = vi.fn();
    const factory = vi.fn(() => ({ checkout }));
    window.Cashfree = factory;

    expect(await startOnlinePayment("inv1", "cashfree", { phone: "9876543210" })).toEqual({ kind: "redirecting" });

    expect(factory).toHaveBeenCalledWith({ mode: "production" });
    expect(checkout).toHaveBeenCalledWith({ paymentSessionId: "sess_1", redirectTarget: "_self" });
    expect(verifyOnlinePayment).not.toHaveBeenCalled();
  });

  it("PayU posts the signed form it was given to PayU", async () => {
    vi.mocked(createOnlinePaymentOrder).mockResolvedValue(order({
      provider: "payu", checkoutKind: "form", checkoutUrl: "https://secure.payu.in/_payment", checkoutFields: { key: "k", txnid: "ss1", amount: "2500.50", hash: "abc" },
    }));
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);

    expect(await startOnlinePayment("inv1", "payu", { name: "A", email: "a@x.test", phone: "9876543210" })).toEqual({ kind: "redirecting" });

    const form = document.querySelector("form")!;
    expect([form.method, form.action]).toEqual(["post", "https://secure.payu.in/_payment"]);
    expect(Object.fromEntries([...form.querySelectorAll("input")].map((i) => [i.name, i.value]))).toEqual({ key: "k", txnid: "ss1", amount: "2500.50", hash: "abc" });
    expect(submit).toHaveBeenCalledOnce();
  });

  it("Stripe sends the browser to its hosted page", async () => {
    vi.mocked(createOnlinePaymentOrder).mockResolvedValue(order({ provider: "stripe", checkoutKind: "redirect", checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" }));
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, assign, href: "http://localhost/" } as unknown as Location);

    expect(await startOnlinePayment("inv1", "stripe", {})).toEqual({ kind: "redirecting" });

    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_1");
  });

  it("never sends the payer to an insecure or missing address", async () => {
    vi.mocked(createOnlinePaymentOrder).mockResolvedValueOnce(order({ provider: "stripe", checkoutKind: "redirect", checkoutUrl: "http://evil.test/pay" }));
    await expect(startOnlinePayment("inv1", "stripe", {})).rejects.toThrow(/securely/);
    vi.mocked(createOnlinePaymentOrder).mockResolvedValueOnce(order({ provider: "payu", checkoutKind: "form", checkoutUrl: null, checkoutFields: {} }));
    await expect(startOnlinePayment("inv1", "payu", {})).rejects.toThrow(/couldn't be opened/);
    vi.mocked(createOnlinePaymentOrder).mockResolvedValueOnce(order({ provider: "cashfree", checkoutKind: "cashfree", checkoutFields: {} }));
    await expect(startOnlinePayment("inv1", "cashfree", {})).rejects.toThrow(/couldn't be opened/);
    vi.mocked(createOnlinePaymentOrder).mockResolvedValueOnce(order({ checkoutKind: "unknown" as never }));
    await expect(startOnlinePayment("inv1", "x", {})).rejects.toThrow(/isn't supported/);
  });
});

describe("completeReturnedPayment", () => {
  it("ignores pages that are not a payment return", async () => {
    expect(await completeReturnedPayment(new URLSearchParams("tab=fees"))).toEqual({ kind: "none" });
    expect(verifyOnlinePayment).not.toHaveBeenCalled();
  });

  it("confirms the order with the gateway named in the address", async () => {
    const result = await completeReturnedPayment(new URLSearchParams("tab=fees&payment=return&gateway=payu&order=ss1"));

    expect(verifyOnlinePayment).toHaveBeenCalledWith({ provider: "payu", orderId: "ss1" });
    expect(result).toMatchObject({ kind: "paid", invoice: { id: "inv1" } });
  });

  it("treats a cancelled checkout as nothing to confirm", async () => {
    expect(await completeReturnedPayment(new URLSearchParams("payment=return&gateway=stripe&order=cancelled&cancelled=1"))).toEqual({ kind: "cancelled" });
    expect(await completeReturnedPayment(new URLSearchParams("payment=return&gateway=stripe"))).toEqual({ kind: "cancelled" });
    expect(verifyOnlinePayment).not.toHaveBeenCalled();
  });

  it("passes on the server's message when the payment hasn't completed", async () => {
    vi.mocked(verifyOnlinePayment).mockRejectedValue(new Error("The payment hasn't completed yet."));

    await expect(completeReturnedPayment(new URLSearchParams("payment=return&gateway=payu&order=ss1"))).rejects.toThrow("hasn't completed");
  });
});
