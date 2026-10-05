import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import {
  extractApiErrorMessage,
  financeHttpClient,
  academicHttpClient,
  getApiErrorStatus,
  resolveFileUrl,
} from "./httpClient";
import { useAuthStore } from "@/store/authStore";
import { allModules, apiError, makeUser } from "@/test/utils";

/** Replaces the transport under a client so its interceptors still run. */
function fakeTransport(client: typeof financeHttpClient, respond: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const { status, data } = respond(config);
    const response = { data, status, statusText: "", headers: {}, config };
    if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, String(status), config, null, response);
    return response;
  };
  const original = client.defaults.adapter;
  client.defaults.adapter = adapter;
  return { seen, restore: () => (client.defaults.adapter = original) };
}

describe("service http clients", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(makeUser("admin"), "access-1", allModules(), true, "refresh-1");
    useAuthStore.getState().setActiveBranchId("tenant-educore-north");
  });

  it("send the bearer token and the switcher's tenant/branch on every request", async () => {
    const transport = fakeTransport(financeHttpClient, () => ({ status: 200, data: [] }));

    await financeHttpClient.get("/api/feeinvoices");
    transport.restore();

    const headers = transport.seen[0].headers;
    expect(headers.Authorization).toBe("Bearer access-1");
    expect(headers["X-Tenant-Id"]).toBe("tenant-educore");
    expect(headers["X-Branch-Id"]).toBe("tenant-educore-north");
  });

  it("lets a request pin its own scope", async () => {
    const transport = fakeTransport(financeHttpClient, () => ({ status: 200 }));

    await financeHttpClient.get("/api/x", { headers: { "X-Branch-Id": "tenant-educore-south" } });
    transport.restore();

    expect(transport.seen[0].headers["X-Branch-Id"]).toBe("tenant-educore-south");
  });

  it("renews an expired access token once and replays the request", async () => {
    const refresh = vi.spyOn(axios, "post").mockResolvedValue({ data: { accessToken: "access-2", refreshToken: "refresh-2" } });
    const transport = fakeTransport(financeHttpClient, (config) =>
      config.headers.Authorization === "Bearer access-2" ? { status: 200, data: "ok" } : { status: 401 },
    );

    const response = await financeHttpClient.get("/api/feeinvoices");
    transport.restore();

    expect(response.data).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0][1]).toEqual({ accessToken: "access-1", refreshToken: "refresh-1" });
    expect(useAuthStore.getState()).toMatchObject({ token: "access-2", refreshToken: "refresh-2" });
  });

  it("shares one refresh between concurrent 401s", async () => {
    let resolveRefresh!: (v: unknown) => void;
    const refresh = vi.spyOn(axios, "post").mockReturnValue(new Promise((r) => (resolveRefresh = r)) as never);
    const transport = fakeTransport(academicHttpClient, (config) =>
      config.headers.Authorization === "Bearer access-2" ? { status: 200, data: config.url } : { status: 401 },
    );

    const both = Promise.all([academicHttpClient.get("/a"), academicHttpClient.get("/b")]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    resolveRefresh({ data: { accessToken: "access-2", refreshToken: "refresh-2" } });
    const [a, b] = await both;
    transport.restore();

    expect([a.data, b.data]).toEqual(["/a", "/b"]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the token can't be renewed", async () => {
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh token revoked"));
    const transport = fakeTransport(financeHttpClient, () => ({ status: 401 }));

    await expect(financeHttpClient.get("/api/feeinvoices")).rejects.toMatchObject({ response: { status: 401 } });
    transport.restore();

    expect(useAuthStore.getState().token).toBeNull();
    expect(sessionStorage.getItem("sms-signout-reason")).toBe("expired");
  });

  it("never refreshes for a failed login, other errors, or signed-out callers", async () => {
    const refresh = vi.spyOn(axios, "post");
    const transport = fakeTransport(financeHttpClient, (config) => ({ status: config.url?.includes("login") ? 401 : 500 }));

    await expect(financeHttpClient.post("/api/auth/login", {})).rejects.toBeTruthy();
    await expect(financeHttpClient.get("/api/broken")).rejects.toBeTruthy();
    useAuthStore.getState().clearAuth();
    await expect(financeHttpClient.get("/api/auth/login")).rejects.toBeTruthy();
    transport.restore();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not attempt a refresh without a refresh token", async () => {
    useAuthStore.setState({ refreshToken: null });
    const refresh = vi.spyOn(axios, "post");
    const transport = fakeTransport(financeHttpClient, () => ({ status: 401 }));

    await expect(financeHttpClient.get("/api/x")).rejects.toBeTruthy();
    transport.restore();

    expect(refresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe("403 and 404 errors", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(makeUser("admin"), "access-1", allModules(), true, "refresh-1");
    vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
  });

  async function failWith(status: number, data: unknown, config: { silentErrors?: boolean } = {}) {
    const transport = fakeTransport(financeHttpClient, () => ({ status, data }));
    await expect(financeHttpClient.get("/api/x", config)).rejects.toBeTruthy();
    transport.restore();
  }

  it("show the server's title and code in a toast", async () => {
    await failWith(403, { title: "You do not have permission to perform this action.", code: "forbidden" });

    expect(toast.error).toHaveBeenCalledWith("You do not have permission to perform this action. (forbidden)", expect.objectContaining({ id: expect.any(String) }));
  });

  it("explain a 404 with no body in plain words", async () => {
    await failWith(404, undefined);

    expect(toast.error).toHaveBeenCalledWith("We couldn't find what you asked for.", expect.anything());
  });

  it("fall back to a generic 403 message", async () => {
    await failWith(403, undefined);

    expect(toast.error).toHaveBeenCalledWith("You don't have permission to do that.", expect.anything());
  });

  it("stay quiet for password_change_required (the route guard handles it), silent requests and other statuses", async () => {
    await failWith(403, { title: "Password change required before accessing this resource.", code: "password_change_required" });
    await failWith(404, { title: "Missing" }, { silentErrors: true });
    await failWith(500, { title: "Boom" });

    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("error helpers", () => {
  it("prefer the first field error, then the problem title, then a connection message", () => {
    expect(extractApiErrorMessage(apiError(400, { title: "Invalid", errors: { name: ["Name is required"] } }))).toBe("Name is required");
    expect(extractApiErrorMessage(apiError(409, { title: "Already exists" }))).toBe("Already exists");
    expect(extractApiErrorMessage(Object.assign(new Error("Network Error"), { isAxiosError: true, toJSON: () => ({}) }))).toMatch(/can't reach the server/);
    expect(extractApiErrorMessage(new Error("boom"), "Fallback")).toBe("Fallback");
    expect(extractApiErrorMessage(apiError(500, {}))).toBe("Something went wrong. Please try again.");
  });

  it("read the status code", () => {
    expect(getApiErrorStatus(apiError(404))).toBe(404);
    expect(getApiErrorStatus(new Error("x"))).toBeUndefined();
  });

  it("resolveFileUrl makes service-relative links absolute and leaves others alone", () => {
    expect(resolveFileUrl("api/people-files/a?sig=1", "http://academic.test/")).toBe("http://academic.test/api/people-files/a?sig=1");
    expect(resolveFileUrl("data:image/png;base64,AA", "http://x/")).toBe("data:image/png;base64,AA");
    expect(resolveFileUrl("https://cdn.test/a.png", "http://x/")).toBe("https://cdn.test/a.png");
    expect(resolveFileUrl(null, "http://x/")).toBeUndefined();
  });
});
