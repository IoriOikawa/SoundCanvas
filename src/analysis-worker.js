import { analyzePCM } from "./analysis.js?v=duck-toggle-1";

self.onmessage = ({ data }) => {
  try {
    const result = analyzePCM(data.pcm, data.sampleRate, (progress) =>
      self.postMessage({ type: "progress", progress }),
    );
    const buffers = Object.values(result)
      .filter((v) => v instanceof Float32Array)
      .map((v) => v.buffer);
    self.postMessage({ type: "complete", result }, buffers);
  } catch (error) {
    self.postMessage({ type: "error", message: error.message });
  }
};
