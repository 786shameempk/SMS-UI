import jsQR from "jsqr";

/** The browser's own QR decoder where it exists (Chrome/Edge on Android and desktop), else jsQR in JavaScript. */
interface NativeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

type DetectorConstructor = new (options: { formats: string[] }) => NativeDetector;

function nativeDetector(): NativeDetector | null {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export function cameraSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Explains a getUserMedia failure in words a teacher can act on. */
export function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission was refused. Allow the camera for this site in the browser settings, or type / scan passes with a handheld scanner.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is being used by another app.";
  return "The camera could not be started.";
}

export async function startCamera(video: HTMLVideoElement, facingMode: "environment" | "user" = "environment"): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Reads one QR code from the current video frame, or null. */
export async function decodeFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, detector: NativeDetector | null | undefined): Promise<string | null> {
  if (video.readyState < 2 || !video.videoWidth) return null;
  if (detector) {
    try {
      const found = await detector.detect(video);
      return found[0]?.rawValue ?? null;
    } catch {
      // fall through to jsQR
    }
  }
  const width = Math.min(video.videoWidth, 960);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

export const createDetector = nativeDetector;

/** The current frame as a JPEG, for face recognition. */
export function captureJpeg(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxWidth = 960): Promise<Blob | null> {
  if (!video.videoWidth) return Promise.resolve(null);
  const width = Math.min(video.videoWidth, maxWidth);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

/** Passes start with this prefix; anything else the camera sees (a book barcode, a URL) is ignored. */
export const PASS_PREFIX = "SSAP1.";
