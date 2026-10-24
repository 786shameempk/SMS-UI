import { createOnlinePaymentOrder, verifyOnlinePayment, type OnlinePaymentOrder, type PayerDetails } from "@/features/fees/api";
import type { FeeInvoice, Receipt } from "@/features/fees/types";
import { openRazorpayCheckout } from "./razorpayCheckout";

/**
 * Opens checkout for whichever gateway the parent chose. Card, UPI and bank details are only ever entered on the gateway's own
 * page or form, never in School Sphere; FinanceService asks the gateway what happened before marking anything paid.
 *
 * Razorpay pays inside a popup and finishes here. Cashfree, PayU and Stripe take the whole page over and send the payer back to
 * the parent portal (see completeReturnedPayment), so those resolve as "redirecting" and the page is about to leave.
 */

export type CheckoutOutcome = { kind: "paid"; invoice: FeeInvoice; receipt: Receipt | null } | { kind: "redirecting" };

const CASHFREE_SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";

interface CashfreeSdk {
  checkout: (options: { paymentSessionId: string; redirectTarget: "_self" | "_modal" }) => Promise<unknown> | void;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeSdk;
  }
}

let cashfreeScript: Promise<void> | null = null;
function loadCashfree(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  cashfreeScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CASHFREE_SDK;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      cashfreeScript = null;
      reject(new Error("Couldn't load the payment page. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return cashfreeScript;
}

/** Only ever send the payer's browser to a secure address the server gave us. */
function secureUrl(url: string | null): string {
  if (!url) throw new Error("The payment page couldn't be opened. Please try again.");
  const parsed = new URL(url, window.location.href);
  if (parsed.protocol !== "https:") throw new Error("The payment page couldn't be opened securely. Please try again.");
  return parsed.toString();
}

function postForm(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = secureUrl(url);
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function startOnlinePayment(
  invoiceId: string,
  provider: string,
  payer: PayerDetails,
): Promise<CheckoutOutcome> {
  const order: OnlinePaymentOrder = await createOnlinePaymentOrder(invoiceId, provider, payer);
  switch (order.checkoutKind) {
    case "razorpay": {
      const result = await openRazorpayCheckout(order, { name: payer.name, email: payer.email });
      const verified = await verifyOnlinePayment({
        provider: order.provider,
        orderId: result.razorpay_order_id,
        paymentId: result.razorpay_payment_id,
        signature: result.razorpay_signature,
      });
      return { kind: "paid", ...verified };
    }
    case "cashfree": {
      const sessionId = order.checkoutFields?.paymentSessionId;
      if (!sessionId) throw new Error("The payment page couldn't be opened. Please try again.");
      await loadCashfree();
      if (!window.Cashfree) throw new Error("Couldn't load the payment page. Please try again.");
      void window.Cashfree({ mode: order.checkoutFields?.mode === "production" ? "production" : "sandbox" }).checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
      return { kind: "redirecting" };
    }
    case "redirect":
      window.location.assign(secureUrl(order.checkoutUrl));
      return { kind: "redirecting" };
    case "form":
      postForm(order.checkoutUrl ?? "", order.checkoutFields ?? {});
      return { kind: "redirecting" };
    default:
      throw new Error("This payment method isn't supported here yet.");
  }
}

export type ReturnedPayment =
  | { kind: "none" }
  | { kind: "cancelled" }
  | { kind: "paid"; invoice: FeeInvoice; receipt: Receipt | null };

/**
 * The payer has come back from a gateway's page (the URL carries payment=return, the gateway and our order). Asks FinanceService
 * to confirm the order with the gateway; throws its message when the payment hasn't completed.
 */
export async function completeReturnedPayment(query: URLSearchParams): Promise<ReturnedPayment> {
  if (query.get("payment") !== "return") return { kind: "none" };
  const provider = query.get("gateway");
  const order = query.get("order");
  if (query.get("cancelled") === "1" || !provider || !order || order === "cancelled") return { kind: "cancelled" };
  const verified = await verifyOnlinePayment({ provider, orderId: order });
  return { kind: "paid", ...verified };
}
