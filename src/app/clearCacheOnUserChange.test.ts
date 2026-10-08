import { QueryClient } from "@tanstack/react-query";
import { clearCacheOnUserChange } from "./clearCacheOnUserChange";
import { signIn, signOut, makeUser } from "@/test/utils";
import { useAuthStore } from "@/store/authStore";

describe("clearCacheOnUserChange", () => {
  afterEach(signOut);

  it("drops cached data when a different person signs in, and on sign-out, but not for the same user", () => {
    signIn("teacher");
    const queryClient = new QueryClient();
    const stop = clearCacheOnUserChange(queryClient);
    queryClient.setQueryData(["ai", "capabilities"], { features: {} });

    // Same user again (a token refresh): the cache stays.
    useAuthStore.setState({ token: "refreshed" });
    expect(queryClient.getQueryData(["ai", "capabilities"])).toBeDefined();

    // Someone else signs in: gone.
    useAuthStore.setState({ user: makeUser("admin", { id: "another-user" }) });
    expect(queryClient.getQueryData(["ai", "capabilities"])).toBeUndefined();

    // Signing out clears too.
    queryClient.setQueryData(["x"], 1);
    useAuthStore.setState({ user: null });
    expect(queryClient.getQueryData(["x"])).toBeUndefined();
    stop();
  });
});
