import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhoneVerificationCard from "./PhoneVerificationCard";
import { getPhoneStatus, requestPhoneVerification, verifyPhone } from "../otpApi";
import { renderWithProviders } from "@/test/utils";

vi.mock("../otpApi", () => ({ getPhoneStatus: vi.fn(), requestPhoneVerification: vi.fn(), verifyPhone: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const challenge = { challengeId: "c1", expiresInSeconds: 300, resendAfterSeconds: 60, maskedDestination: "+91*******881" };

describe("PhoneVerificationCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays out of the way while sign-in with a code is switched off", async () => {
    vi.mocked(getPhoneStatus).mockResolvedValue({ maskedPhone: null, confirmed: false, otpEnabled: false });
    const { container } = renderWithProviders(<PhoneVerificationCard />);

    await waitFor(() => expect(getPhoneStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("verifies a new number with a code, then shows it as verified", async () => {
    const user = userEvent.setup();
    vi.mocked(getPhoneStatus)
      .mockResolvedValueOnce({ maskedPhone: null, confirmed: false, otpEnabled: true })
      .mockResolvedValue({ maskedPhone: "+91*******881", confirmed: true, otpEnabled: true });
    vi.mocked(requestPhoneVerification).mockResolvedValue(challenge);
    vi.mocked(verifyPhone).mockResolvedValue();
    renderWithProviders(<PhoneVerificationCard />);

    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Mobile number"), "98960 40881");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(requestPhoneVerification).toHaveBeenCalledWith("98960 40881");

    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify number" }));

    expect(verifyPhone).toHaveBeenCalledWith("c1", "123456");
    expect(await screen.findByText("Verified")).toBeInTheDocument();
  });

  it("shows a wrong code in place and keeps the form", async () => {
    const user = userEvent.setup();
    vi.mocked(getPhoneStatus).mockResolvedValue({ maskedPhone: "+91*******881", confirmed: false, otpEnabled: true });
    vi.mocked(requestPhoneVerification).mockResolvedValue(challenge);
    vi.mocked(verifyPhone).mockRejectedValue(new Error("That code is incorrect or has expired."));
    renderWithProviders(<PhoneVerificationCard />);

    await user.type(await screen.findByLabelText("New mobile number"), "9447012345");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify number" }));

    expect(await screen.findByText("That code is incorrect or has expired.")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });
});
