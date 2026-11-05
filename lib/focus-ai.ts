type FocusAction = "observe" | "plan" | "image-cue" | "transcribe" | "status" | "validate-goal" | "chat" | "web-search";

function proxyUrl() {
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")
    && window.location.host !== "tauri.localhost") {
    return `${window.location.origin}/api/focus`;
  }
  if (process.env.NEXT_PUBLIC_FOCUS_PROXY_URL) return process.env.NEXT_PUBLIC_FOCUS_PROXY_URL;
  throw new Error("Set NEXT_PUBLIC_FOCUS_PROXY_URL to your hosted /api/focus endpoint before building the desktop app.");
}

export async function focusRequest<T>(body: { action: FocusAction; [key: string]: unknown }): Promise<T> {
  const response = await fetch(proxyUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(115_000),
  });
  let data: T & { error?: string };
  try {
    data = await response.json() as T & { error?: string };
  } catch {
    throw new Error(`Focus service returned an unexpected response (${response.status}). Check that the local app server is running and /api/focus is available.`);
  }
  if (!response.ok) throw new Error(data.error || `Focus request failed (${response.status}).`);
  return data;
}

export async function audioBlobToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const targetRate = 24_000;
    const step = decoded.sampleRate / targetRate;
    const length = Math.ceil(decoded.length / step);
    const samples = new Float32Array(length);
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    for (let index = 0; index < length; index += 1) {
      const sourceIndex = Math.min(Math.floor(index * step), decoded.length - 1);
      let value = 0;
      for (const channel of channels) value += channel[sourceIndex] / channels.length;
      samples[index] = value;
    }

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeText = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    writeText(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); writeText(8, "WAVE");
    writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeText(36, "data"); view.setUint32(40, samples.length * 2, true);
    for (let index = 0; index < samples.length; index += 1) {
      const value = Math.max(-1, Math.min(1, samples[index]));
      view.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  } finally {
    await context.close();
  }
}
