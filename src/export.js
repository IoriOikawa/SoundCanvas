import { abortable } from "./abort.js?v=signal-aa-1";
import { clipRange } from "./model.js?v=signal-aa-1";
import { createSceneRenderer } from "./scenes.js?v=signal-aa-1";
import { withWebmDuration } from "./webm.js?v=signal-aa-1";

export function recordingType() {
  if (
    typeof MediaRecorder === "undefined" ||
    !HTMLCanvasElement.prototype.captureStream
  )
    return null;
  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/mp4",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type)) || null
  );
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Real-time film capture. Geometry uses audio time, while the recorder's
 * frame delivery is browser-dependent; this is not an offline encoder. */
export async function recordFilm({
  transport,
  analysis,
  settings,
  seconds,
  signal,
  onProgress,
  createRenderer = createSceneRenderer,
}) {
  const mimeType = recordingType();
  if (!mimeType)
    throw new Error(
      "Film export is unavailable in this browser. Try current desktop Chrome or Edge.",
    );
  const range = clipRange(transport.time, seconds, transport.duration);
  const context = await transport.ready();
  if (signal?.aborted)
    throw new DOMException("Export cancelled.", "AbortError");
  const previous = { time: transport.time, playing: transport.playing };
  transport.pause();
  let renderer, source, destination, stream, recorder, frame, timer;
  let cleanupListeners = () => {};
  const canvas = document.createElement("canvas");
  try {
    renderer = createRenderer(canvas, settings);
    await abortable(renderer.ready, signal);
    await abortable(
      renderer.prepare?.(analysis, range.start, settings, signal),
      signal,
    );
    if (signal?.aborted)
      throw new DOMException("Export cancelled.", "AbortError");
    renderer.resize(1280, 720);
    renderer.render(analysis, range.start, settings);
    stream = canvas.captureStream(30);
    destination = context.createMediaStreamDestination();
    for (const track of destination.stream.getAudioTracks())
      stream.addTrack(track);
    source = context.createBufferSource();
    source.buffer = transport.buffer;
    source.connect(destination);
    source.connect(context.destination);
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6000000,
      audioBitsPerSecond: 192000,
    });
    const chunks = [];
    const blob = await new Promise((resolve, reject) => {
      let done = false;
      let failure = null;
      cleanupListeners = () => {
        signal?.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", visibility);
      };
      const stop = (error) => {
        if (done) return;
        done = true;
        failure = error;
        cleanupListeners();
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        try {
          source.stop();
        } catch {
          /* Ended naturally. */
        }
        if (recorder.state !== "inactive") recorder.stop();
        else reject(error || new Error("Recording did not start."));
      };
      const abort = () =>
        stop(new DOMException("Export cancelled.", "AbortError"));
      const visibility = () => {
        if (document.hidden)
          stop(
            new Error(
              "Export stopped because this tab was hidden. Keep it open while recording.",
            ),
          );
      };
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () =>
        stop(
          new Error(
            "The browser could not finish recording. Try a shorter clip.",
          ),
        );
      recorder.onstop = () => {
        cleanupListeners();
        if (failure) reject(failure);
        else if (!chunks.length)
          reject(new Error("The recording was empty. Please try again."));
        else resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
      signal?.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", visibility);
      if (signal?.aborted) {
        abort();
        return;
      }
      recorder.start(250);
      const startedAt = context.currentTime;
      source.onended = () => stop();
      source.start(0, range.start, range.duration);
      const draw = () => {
        if (done) return;
        const elapsed = Math.max(0, context.currentTime - startedAt);
        const time = range.start + Math.min(elapsed, range.duration);
        if (renderer.failed) {
          stop(
            new Error(
              "Graphics were interrupted during export. Please try again.",
            ),
          );
          return;
        }
        renderer.render(analysis, time, settings);
        onProgress({ time, progress: Math.min(1, elapsed / range.duration) });
        frame = requestAnimationFrame(draw);
      };
      draw();
      timer = setTimeout(() => stop(), (range.duration + 2) * 1000);
    });
    const output = blob.type.includes("webm")
      ? new Blob(
          [
            withWebmDuration(
              new Uint8Array(await blob.arrayBuffer()),
              range.duration,
            ),
          ],
          { type: blob.type },
        )
      : blob;
    if (signal?.aborted)
      throw new DOMException("Export cancelled.", "AbortError");
    return {
      blob: output,
      extension: blob.type.includes("mp4") ? "mp4" : "webm",
      duration: range.duration,
    };
  } finally {
    cleanupListeners();
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    stream?.getTracks().forEach((track) => track.stop());
    destination?.disconnect();
    renderer?.dispose();
    await transport.seek(previous.time);
    if (previous.playing) await transport.play();
  }
}
