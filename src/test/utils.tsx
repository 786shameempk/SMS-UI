import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, type RenderOptions } from "@testing-library/react";
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { vi } from "vitest";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser, ModulePermissions, UserRole } from "@/types/auth";

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
}

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  /** Extra routes rendered next to the element (e.g. "/login" to observe redirects). */
  routes?: { path: string; element: ReactNode }[];
  path?: string;
  queryClient?: QueryClient;
}

/** Renders inside React Query + a memory router, the way pages are mounted in the app. */
export function renderWithProviders(ui: ReactElement, { route = "/", path = "*", routes = [], queryClient = testQueryClient(), ...options }: ProviderOptions = {}) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
    options,
  );
  return { ...result, queryClient };
}

export const allModules = (enabled = true): ModulePermissions =>
  new Proxy({} as ModulePermissions, { get: () => enabled, has: () => true });

export function makeUser(role: UserRole = "admin", overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "user@school.test",
    role,
    tenantId: role === "superAdmin" ? null : "tenant-educore",
    branchId: role === "admin" || role === "superAdmin" ? null : "tenant-educore-main",
    allBranchAccess: role === "admin" || role === "superAdmin",
    ...overrides,
  };
}

/** Puts a signed-in session in the auth store (no network, no credentials). */
export function signIn(role: UserRole = "admin", overrides: Partial<AuthUser> = {}, permissions: ModulePermissions = allModules()) {
  const user = makeUser(role, overrides);
  useAuthStore.getState().setSession(user, "test-access-token", permissions, true, "test-refresh-token");
  return user;
}

export function signOut() {
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    modulePermissions: null,
    expiresAt: null,
  });
}

export function ok<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: "OK", headers: {}, config: {} as InternalAxiosRequestConfig };
}

type Verb = "get" | "post" | "put" | "patch" | "delete";

/**
 * Stubs an axios client's verbs. `routes` maps "GET /api/x" (or a RegExp source) to the response body or a
 * function of (url, body, config). Unmatched calls fail loudly so a test never silently hits the network.
 */
export function stubClient(client: AxiosInstance, routes: Record<string, unknown> = {}) {
  const calls: { method: string; url: string; body?: unknown; config?: unknown }[] = [];
  const respond = (method: Verb) =>
    vi.spyOn(client, method).mockImplementation((async (url: string, bodyOrConfig?: unknown, maybeConfig?: unknown) => {
      const hasBody = method === "post" || method === "put" || method === "patch";
      const body = hasBody ? bodyOrConfig : undefined;
      const config = hasBody ? maybeConfig : bodyOrConfig;
      calls.push({ method: method.toUpperCase(), url, body, config });
      const key = Object.keys(routes).find((k) => {
        const [m, pattern] = k.split(" ");
        return m === method.toUpperCase() && (pattern === url || new RegExp(`^${pattern}$`).test(url));
      });
      if (!key) throw new Error(`Unexpected ${method.toUpperCase()} ${url}`);
      const value = routes[key];
      const data = typeof value === "function" ? await (value as (u: string, b: unknown, c: unknown) => unknown)(url, body, config) : value;
      return ok(data);
    }) as never);
  (["get", "post", "put", "patch", "delete"] as const).forEach(respond);
  return calls;
}

/** An axios-style error with a ProblemDetails body. */
export function apiError(status: number, body: Record<string, unknown> = { title: "Request failed" }) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: body, statusText: "", headers: {}, config: {} },
    toJSON: () => ({}),
  });
}
