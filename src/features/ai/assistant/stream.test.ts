import { useAuthStore } from "@/store/authStore";
import { signIn, signOut } from "@/test/utils";
import { AssistantStreamError, streamAssistantMessage, type AssistantStreamEvent } from "./stream";

/** A fetch Response whose body arrives in the given chunks (split mid-event on purpose). */
function sseResponse(chunks: string[], status = 200, contentType = "text/event-stream") {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": contentType } });
}

describe("streamAssistantMessage", () => {
  beforeEach(() => signIn("parent"));
  afterEach(() => {
    signOut();
    vi.unstubAllGlobals();
  });

  it("parses events split across chunks, sends auth headers, and resolves with the final answer", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: start\ndata: {"conversationId":"c1"}\n\nevent: del',
        'ta\ndata: {"text":"Rs "}\n\nevent: reset\ndata: {}\n\nevent: lookup\ndata: {"source":"fees"}\n\n',
        'event: delta\ndata: {"text":"600 is due."}\n\n',
        'event: done\ndata: {"conversationId":"c1","reply":"600 is due.","sources":["fees"]}\n\n',
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events: AssistantStreamEvent[] = [];

    const result = await streamAssistantMessage({ message: "fees?" }, (e) => events.push(e));

    expect(result).toEqual({ conversationId: "c1", reply: "600 is due.", sources: ["fees"], actions: [] });
    expect(events.map((e) => e.type)).toEqual(["start", "delta", "reset", "lookup", "delta", "done"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/api\/ai\/chat\/stream$/);
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${useAuthStore.getState().token}`);
    expect(JSON.parse(String(init.body))).toEqual({ message: "fees?" });
  });

  it("turns a problem response into an error with the server's message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "You have reached your daily AI request limit.", errorCode: "AI_QUOTA_EXCEEDED" }), { status: 429 })));

    await expect(streamAssistantMessage({ message: "hi" }, () => {})).rejects.toMatchObject({ message: "You have reached your daily AI request limit.", code: "AI_QUOTA_EXCEEDED" });
  });

  it("reports a provider error event with the text received so far", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([
      'event: start\ndata: {"conversationId":"c9"}\n\nevent: delta\ndata: {"text":"Half an"}\n\n',
      'event: error\ndata: {"errorCode":"AI_PROVIDER_ERROR","message":"The AI provider could not answer right now."}\n\n',
    ])));

    const err = await streamAssistantMessage({ message: "hi" }, () => {}).catch((e) => e);

    expect(err).toBeInstanceOf(AssistantStreamError);
    expect(err).toMatchObject({ partial: "Half an", conversationId: "c9", code: "AI_PROVIDER_ERROR" });
  });

  it("treats a stream that ends without a final answer as interrupted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(['event: delta\ndata: {"text":"Partial"}\n\n'])));

    await expect(streamAssistantMessage({ message: "hi" }, () => {})).rejects.toMatchObject({ partial: "Partial" });
  });

  it("retries once with a renewed token after a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(sseResponse(['event: done\ndata: {"conversationId":"c1","reply":"ok","sources":[]}\n\n']));
    vi.stubGlobal("fetch", fetchMock);
    const axios = (await import("axios")).default;
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { accessToken: "fresh-token", refreshToken: "r2" } });

    await expect(streamAssistantMessage({ message: "hi" }, () => {})).resolves.toMatchObject({ reply: "ok" });

    expect(post).toHaveBeenCalledTimes(1);
    expect(new Headers((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].headers).get("Authorization")).toBe("Bearer fresh-token");
    post.mockRestore();
  });
});
