import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentGatewayOption } from "@/features/fees/api";
import type { FeeInvoice } from "../types";
import OnlinePaymentDialog from "./OnlinePaymentDialog";

const invoice = { id: "i1", studentId: "st1", term: "Term 1", amount: 2500.5, dueDate: "2026-10-10", status: "due" } as FeeInvoice;
const razorpay: PaymentGatewayOption = { provider: "razorpay", displayName: "Razorpay", mode: "Live", isDefault: true, payerFields: [] };
const cashfree: PaymentGatewayOption = { provider: "cashfree", displayName: "Cashfree", mode: "Test", isDefault: false, payerFields: ["phone"] };
const payu: PaymentGatewayOption = { provider: "payu", displayName: "PayU", mode: "Live", isDefault: false, payerFields: ["name", "email", "phone"] };

function setup(gateways: PaymentGatewayOption[], onPay = vi.fn(async () => undefined)) {
  render(<OnlinePaymentDialog open onOpenChange={() => undefined} invoice={invoice} onPay={onPay} submitting={false} gateways={gateways} prefill={{ name: "Asha Nair", email: "asha@example.com" }} />);
  return onPay;
}

describe("OnlinePaymentDialog", () => {
  it("says online payment isn't set up when no gateway is on, and offers no pay button", () => {
    setup([]);

    expect(screen.getByText(/isn't set up for this school/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to pay/ })).not.toBeInTheDocument();
  });

  it("pays straight away with the only gateway when it needs nothing from the payer", async () => {
    const onPay = setup([razorpay]);

    await userEvent.click(screen.getByRole("button", { name: /Continue to pay/ }));

    expect(onPay).toHaveBeenCalledWith("razorpay", { name: "Asha Nair", email: "asha@example.com", phone: undefined });
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("lets the parent choose between gateways, and asks only for what the chosen one needs", async () => {
    const onPay = setup([razorpay, cashfree, payu]);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByLabelText("Mobile number")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Cashfree/ }));

    const pay = screen.getByRole("button", { name: /Continue to pay/ });
    expect(pay).toBeDisabled(); // phone still missing
    await userEvent.type(screen.getByLabelText("Mobile number"), "98765 43210");
    expect(pay).toBeEnabled();
    await userEvent.click(pay);

    expect(onPay).toHaveBeenCalledWith("cashfree", expect.objectContaining({ phone: "9876543210" }));
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("refuses a phone number that can't be right, and asks PayU for name, email and phone", async () => {
    setup([payu]);

    expect(screen.getByLabelText("Your name")).toHaveValue("Asha Nair");
    expect(screen.getByLabelText("Email address")).toHaveValue("asha@example.com");
    await userEvent.type(screen.getByLabelText("Mobile number"), "12345");

    expect(screen.getByText("Enter a 10-digit mobile number.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to pay/ })).toBeDisabled();
  });
});
