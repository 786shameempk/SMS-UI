import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { ReadAloudButton, VoiceInputButton } from "./VoiceButtons";
import * as voiceApi from "../../voice/api";

vi.mock("../../voice/api", () => ({ transcribe: vi.fn(), speak: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

class FakeRecorder {
  static isTypeSupported = (t: string) => t === "audio/webm";
  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: { getTracks: () => { stop: () => void }[] }) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["abc"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

describe("voice", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("records, transcribes and hands the text back for review instead of sending it", async () => {
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) } });
    vi.mocked(voiceApi.transcribe).mockResolvedValue({ text: " When is the next exam? ", language: "en" });
    const onText = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<VoiceInputButton onText={onText} />);

    await user.click(screen.getByRole("button", { name: /speak your question/i }));
    await user.click(await screen.findByRole("button", { name: /stop recording/i }));

    await waitFor(() => expect(onText).toHaveBeenCalledWith("When is the next exam?"));
    expect(vi.mocked(voiceApi.transcribe).mock.calls[0][0].type).toBe("audio/webm");
  });

  it("reads an answer aloud and can stop it", async () => {
    const play = vi.fn(async () => undefined);
    const pause = vi.fn();
    vi.stubGlobal(
      "Audio",
      class {
        onended: (() => void) | null = null;
        play = play;
        pause = pause;
      },
    );
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    vi.mocked(voiceApi.speak).mockResolvedValue(new Blob([new Uint8Array([1])], { type: "audio/mpeg" }));
    const user = userEvent.setup();
    renderWithProviders(<ReadAloudButton text="Rs 600 is due on 10 Oct." />);

    await user.click(screen.getByRole("button", { name: /read aloud/i }));
    expect(await screen.findByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(voiceApi.speak).toHaveBeenCalledWith("Rs 600 is due on 10 Oct.");
    expect(play).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /stop/i }));
    expect(pause).toHaveBeenCalled();
  });
});
