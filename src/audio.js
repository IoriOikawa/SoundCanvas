import { clamp } from "./model.js?v=duck-toggle-1";

export class AudioTransport extends EventTarget {
  constructor() {
    super();
    this.context = null;
    this.buffer = null;
    this.source = null;
    this.offset = 0;
    this.startedAt = 0;
  }

  async ready() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context)
        throw new Error(
          "This browser cannot play and analyze audio. Try a current desktop browser.",
        );
      this.context = new Context();
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  get duration() {
    return this.buffer?.duration || 0;
  }
  get playing() {
    return !!this.source;
  }
  get time() {
    return this.source
      ? clamp(
          this.offset + this.context.currentTime - this.startedAt,
          0,
          this.duration,
        )
      : this.offset;
  }

  async decode(bytes) {
    const context = await this.ready();
    const buffer = await context.decodeAudioData(bytes);
    if (buffer.duration > 600)
      throw new Error(
        "Choose a track shorter than 10 minutes for this first edition.",
      );
    if (buffer.duration < 0.3)
      throw new Error("Choose an audio clip at least a second long.");
    return buffer;
  }

  setBuffer(buffer) {
    this.pause();
    this.buffer = buffer;
    this.offset = 0;
    this.dispatchEvent(new Event("change"));
  }

  async play() {
    if (!this.buffer || this.source) return;
    const context = await this.ready();
    if (this.source) return;
    if (this.offset >= this.duration) this.offset = 0;
    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(context.destination);
    this.source = source;
    this.startedAt = context.currentTime;
    source.onended = () => {
      if (this.source !== source) return;
      source.disconnect();
      this.source = null;
      this.offset = this.duration;
      this.dispatchEvent(new Event("change"));
    };
    source.start(0, this.offset);
    this.dispatchEvent(new Event("change"));
  }

  pause() {
    if (!this.source) return;
    this.offset = this.time;
    const source = this.source;
    this.source = null;
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* Already ended. */
    }
    source.disconnect();
    this.dispatchEvent(new Event("change"));
  }

  async seek(time) {
    const playing = this.playing;
    this.pause();
    this.offset = clamp(time, 0, this.duration);
    if (playing && this.offset < this.duration) await this.play();
    this.dispatchEvent(new Event("change"));
  }
}

export function analyzeBuffer(buffer, onProgress = () => {}) {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < mono.length; i++)
      mono[i] += samples[i] / buffer.numberOfChannels;
  }
  // Preserve useful features for stereo material with near-opposite channels.
  let mixedPower = 0,
    firstPower = 0;
  const first = buffer.getChannelData(0);
  for (let i = 0; i < mono.length; i += 16) {
    mixedPower += mono[i] ** 2;
    firstPower += first[i] ** 2;
  }
  if (mixedPower < firstPower * 0.01) mono.set(first);
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./analysis-worker.js", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") onProgress(data.progress);
      else {
        worker.terminate();
        if (data.type === "complete") resolve(data.result);
        else reject(new Error(data.message));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(
        new Error(
          "Audio analysis could not finish. Please reload and try a shorter track.",
        ),
      );
    };
    worker.postMessage({ pcm: mono, sampleRate: buffer.sampleRate }, [
      mono.buffer,
    ]);
  });
}
