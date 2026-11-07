import * as otp from "./otpApi";
import { authHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const apiUser = {
  id: "u1", email: "asha@school.test", firstName: "Asha", lastName: "Nair", tenantId: "tenant-a", branchId: "tenant-a-main",
  allBranchAccess: false, roles: ["Teacher"], permissions: ["module.students"],
};
const session = { accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "", user: apiUser };
const challenge = { challengeId: "c1", expiresInSeconds: 300, resendAfterSeconds: 60, maskedDestination: "a***@school.test" };

describe("one-time code api", () => {
  it("reads which methods the server offers, and treats any failure as password only", async () => {
    const calls = stubClient(authHttpClient, { "GET /api/auth/methods": { password: true, otpEmail: true, otpMobile: false, otpWhatsApp: false } });
    expect(await otp.getAuthMethods()).toEqual({ password: true, otpEmail: true, otpMobile: false, otpWhatsApp: false });
    expect((calls[0].config as { params: unknown }).params).toEqual({ subdomain: null }); // the school the page was opened for, so a pilot can be per school

    vi.restoreAllMocks();
    vi.spyOn(authHttpClient, "get").mockRejectedValue(apiError(500));
    expect(await otp.getAuthMethods()).toEqual({ password: true, otpEmail: false, otpMobile: false, otpWhatsApp: false });
  });

  it("requests, resends and verifies a code for the school the page was opened on", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/auth/otp/request": challenge,
      "POST /api/auth/otp/resend": { ...challenge, challengeId: "c2" },
      "POST /api/auth/otp/verify": session,
    });

    const first = await otp.requestOtp("email", "  asha@school.test ");
    const second = await otp.resendOtp(first.challengeId);
    const result = await otp.verifyOtp(second.challengeId, "123456");

    expect(calls[0].body).toEqual({ channel: "email", destination: "asha@school.test", subdomain: null });
    expect(calls[1].body).toEqual({ challengeId: "c1" });
    expect(calls[2].body).toEqual({ challengeId: "c2", code: "123456", subdomain: null });
    expect(result).toMatchObject({ kind: "session", session: { token: "a", refreshToken: "r", user: { name: "Asha Nair", role: "teacher" } } });
  });

  it("returns the accounts to choose from when a number is shared, and signs the chosen one in", async () => {
    const accounts = [{ userId: "u1", displayName: "Asha Nair", schoolName: "Green Valley", roleLabel: "Parent" }];
    const calls = stubClient(authHttpClient, {
      "POST /api/auth/otp/verify": { status: "select_account", selectionToken: "tok", accounts },
      "POST /api/auth/otp/select": session,
    });

    expect(await otp.verifyOtp("c1", "123456")).toEqual({ kind: "select", selectionToken: "tok", accounts });
    const chosen = await otp.selectOtpAccount("tok", "u1");

    expect(calls[1].body).toEqual({ selectionToken: "tok", userId: "u1", subdomain: null });
    expect(chosen.user.name).toBe("Asha Nair");
  });

  it("verifies a mobile number for the signed-in user", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/auth/phone": { maskedPhone: "+91*******881", confirmed: false, otpEnabled: true },
      "POST /api/auth/phone/request": challenge,
      "POST /api/auth/phone/verify": null,
    });

    expect(await otp.getPhoneStatus()).toEqual({ maskedPhone: "+91*******881", confirmed: false, otpEnabled: true });
    await otp.requestPhoneVerification(" 98960 40881 ");
    await otp.verifyPhone("c1", "123456");

    expect(calls[1].body).toEqual({ phoneNumber: "98960 40881" });
    expect(calls[2].body).toEqual({ challengeId: "c1", code: "123456" });
  });

  it("turns server problems into readable errors", async () => {
    vi.spyOn(authHttpClient, "post").mockRejectedValue(apiError(401, { title: "That code is incorrect or has expired.", code: "otp_invalid" }));
    await expect(otp.verifyOtp("c1", "000000")).rejects.toThrow("That code is incorrect or has expired.");

    vi.spyOn(authHttpClient, "post").mockRejectedValue(apiError(429, { title: "Please wait before requesting another code." }));
    await expect(otp.resendOtp("c1")).rejects.toThrow("Too many attempts. Please wait a minute and try again.");
  });
});
