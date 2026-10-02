import { aiHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";
import { sendAssistantMessage } from "./api";

describe("sendAssistantMessage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("posts to AiService and returns its reply", async () => {
    const reply = { conversationId: "c1", reply: "Rs 4,000 pending", sources: ["fees"] };
    const calls = stubClient(aiHttpClient, { "POST api/ai/chat": reply });

    const res = await sendAssistantMessage({ message: "fees pending?" });

    expect(res).toEqual(reply);
    expect(calls[0].body).toEqual({ message: "fees pending?" });
  });
});
