import { CheckoutDismissed, payInvoiceWithRazorpay } from "./razorpayCheckout";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/features/fees/api";

vi.mock("@/features/fees/api", () => ({ createRazorpayOrder: vi.fn(), verifyRazorpayPayment: vi.fn() }));

const order = { keyId: "rzp_test_key", orderId: "order_1", amountPaise: 150000, currency: "INR", description: "Term 1 fee" };

/** Fake checkout.js constructor: records options and lets each test decide how the payer behaves. */
function installRazorpay(behave: (options: Record<string, any>) => void) {
  const instances: Array<{ options: Record<string, any>; on: ReturnType<typeof vi.fn> }> = [];
  window.Razorpay = vi.fn(function (this: unknown, options: Record<string, any>) {
    const instance = { options, on: vi.fn(), open: () => behave(options) };
    instances.push(instance);
    return instance;
  }) as never;
  return instances;
}

describe("Razorpay checkout", () => {
  beforeEach(() => {
    vi.mocked(createRazorpayOrder).mockResolvedValue(order as never);
    vi.mocked(verifyRazorpayPayment).mockResolvedValue({ invoice: { id: "inv1" }, receipt: null } as never);
  });
  afterEach(() => {
    delete window.Razorpay;
  });

  it("opens checkout for the server-created order and verifies the signed result", async () => {
    const instances = installRazorpay((o) => o.handler({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" }));

    const result = await payInvoiceWithRazorpay("inv1", { name: "Parent", email: "p@example.com" });

    expect(createRazorpayOrder).toHaveBeenCalledWith("inv1");
    expect(instances[0].options).toMatchObject({ key: "rzp_test_key", order_id: "order_1", amount: 150000, currency: "INR", prefill: { name: "Parent", email: "p@example.com" } });
    expect(instances[0].on).toHaveBeenCalledWith("payment.failed", expect.any(Function));
    expect(verifyRazorpayPayment).toHaveBeenCalledWith({ orderId: "order_1", paymentId: "pay_1", signature: "sig" });
    expect(result).toEqual({ invoice: { id: "inv1" }, receipt: null });
  });

  it("closing the checkout rejects with CheckoutDismissed and verifies nothing", async () => {
    installRazorpay((o) => o.modal.ondismiss());

    await expect(payInvoiceWithRazorpay("inv1", {})).rejects.toBeInstanceOf(CheckoutDismissed);
    expect(verifyRazorpayPayment).not.toHaveBeenCalled();
  });

  it("loads checkout.js once when it isn't on the page yet, and allows a retry after a load failure", async () => {
    const append = vi.spyOn(document.body, "appendChild");

    const failed = payInvoiceWithRazorpay("inv1", {});
    const script = append.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toBe("https://checkout.razorpay.com/v1/checkout.js");
    script.onerror!(new Event("error"));
    await expect(failed).rejects.toThrow("Couldn't load the payment page. Check your connection and try again.");

    const retry = payInvoiceWithRazorpay("inv1", {});
    const second = append.mock.calls[1][0] as HTMLScriptElement;
    installRazorpay((o) => o.handler({ razorpay_payment_id: "p", razorpay_order_id: "o", razorpay_signature: "s" }));
    second.onload!(new Event("load"));
    await expect(retry).resolves.toBeDefined();
  });

  it("reuses the loaded script and fails clearly if Razorpay is missing from the page", async () => {
    // The previous test left checkout.js "loaded" (module-level promise); window.Razorpay was removed afterwards.
    const append = vi.spyOn(document.body, "appendChild");

    await expect(payInvoiceWithRazorpay("inv1", {})).rejects.toThrow("Couldn't load the payment page. Please try again.");
    expect(append).not.toHaveBeenCalled();
  });
});
