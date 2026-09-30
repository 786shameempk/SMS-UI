import { createRazorpayOrder, verifyRazorpayPayment } from "@/features/fees/api";

/**
 * Razorpay Standard Checkout (checkout.js) for the web parent portal. Card/UPI details are entered on
 * Razorpay's own form, never in School Sphere; FinanceService verifies the signed result before marking paid.
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Thrown when the parent closes the checkout without paying - not an error to toast. */
export class CheckoutDismissed extends Error {}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the payment page. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function payInvoiceWithRazorpay(invoiceId: string, prefill: { name?: string; email?: string }) {
  const [order] = await Promise.all([createRazorpayOrder(invoiceId), loadScript()]);
  if (!window.Razorpay) throw new Error("Couldn't load the payment page. Please try again.");
  const Razorpay = window.Razorpay;

  const result = await new Promise<RazorpaySuccess>((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "School Sphere",
      description: order.description,
      prefill,
      theme: { color: "#ECA427" },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: { ondismiss: () => reject(new CheckoutDismissed("Payment cancelled")) },
    });
    // Razorpay lets the payer retry inside the same checkout after a failure, so this only informs.
    checkout.on("payment.failed", () => undefined);
    checkout.open();
  });

  return verifyRazorpayPayment({ orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature });
}
