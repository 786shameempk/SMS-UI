import { normalizeCapabilities } from "./capabilities";

describe("normalizeCapabilities", () => {
  it("reads anything that isn't a capabilities object as no AI", () => {
    for (const raw of [[], "<html>Bad gateway</html>", null, 42]) {
      const c = normalizeCapabilities(raw);
      expect(c.features).toEqual({});
      expect(c.capabilities.chat).toBe(false);
      expect(c.languages).toEqual(["English"]);
    }
  });

  it("keeps a real answer and fills in missing flags", () => {
    const c = normalizeCapabilities({ provider: "OpenAI", capabilities: { chat: true }, features: { chat: { allowed: true, available: true } }, languages: ["English", "Hindi"] });
    expect(c.provider).toBe("OpenAI");
    expect(c.capabilities.chat).toBe(true);
    expect(c.capabilities.voice).toBe(false);
    expect(c.features.chat?.available).toBe(true);
    expect(c.languages).toEqual(["English", "Hindi"]);
  });
});
