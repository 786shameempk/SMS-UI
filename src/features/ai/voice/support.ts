/** Whether this browser can record audio for voice input. */
export const canRecord = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
