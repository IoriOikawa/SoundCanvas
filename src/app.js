import {
  selectPoolDrops,
  preparePoolDropPreview,
} from "./pool-drop.js?v=duck-toggle-1";
import { movePoolCamera } from "./pool-hall.js?v=duck-toggle-1";
import { AudioTransport, analyzeBuffer } from "./audio.js?v=duck-toggle-1";
import { createSceneRenderer } from "./scenes.js?v=duck-toggle-1";
import {
  DEFAULT_SETTINGS,
  clamp,
  formatTime,
  parseSettings,
  serializeSettings,
  clipRange,
} from "./model.js?v=duck-toggle-1";
import { recordFilm, recordingType, download } from "./export.js?v=duck-toggle-1";

const $ = (id) => document.getElementById(id);
const transport = new AudioTransport();
const storageKey = "soundcanvas.studio.v1";
let settings = { ...DEFAULT_SETTINGS };
try {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    settings = parseSettings(stored);
    if (JSON.parse(stored).settings.scene === undefined)
      settings.scene = "pool";
    if (JSON.parse(stored).name === "SoundCanvas · Resonant form") {
      settings.yaw = DEFAULT_SETTINGS.yaw;
      settings.pitch = DEFAULT_SETTINGS.pitch;
    }
  }
} catch {
  /* Storage must not block the studio. */
}
let analysis = null,
  loading = false,
  previewController = null,
  exporting = false,
  exportTime = 0,
  exportController = null;
let lastFilm = null,
  trackName = "Ring On Your Way",
  dirty = true,
  renderer = null,
  drag = null;
const walkingKeys = new Set();
const walkingCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"];
const recordingSupport = recordingType();
const canvas = $("sculpture"),
  wave = $("waveform"),
  waveformContext = wave.getContext("2d");
let wavePeaks = [];

function status(message, error = false) {
  $("status-text").textContent = message;
  $("status").classList.toggle("error", error);
}
function persist() {
  try {
    localStorage.setItem(storageKey, serializeSettings(settings));
  } catch {
    /* Download remains available. */
  }
}
function ensureRenderer() {
  if (renderer?.scene === settings.scene) return;
  renderer?.dispose();
  renderer = null;
  try {
    renderer = createSceneRenderer(canvas, settings, {
      onError: (error) => {
        status(error.message, true);
        exportController?.abort();
      },
    });
    renderer.previewStart = performance.now();
  } catch (error) {
    status(error.message, true);
  }
  updateAvailability();
  dirty = true;
}
function updateDropControls() {
  const events = selectPoolDrops(analysis);
  $("pool-event-controls").hidden = true;
  $("duck-controls").hidden = settings.scene !== "pool";
  $("duck-toggle").setAttribute("aria-pressed", String(settings.duckVisible));
  $("duck-toggle").textContent = settings.duckVisible ? "Duck on" : "Duck off";
  $("duck-toggle").disabled = loading || exporting || !renderer;
  $("pool-drop-toggle").setAttribute("aria-pressed", String(settings.poolDrop));
  $("pool-drop-toggle").textContent = settings.poolDrop
    ? "Musical drops"
    : "Pure water";
  $("pool-drop-toggle").disabled = loading || exporting || !renderer;
  $("preview-drop").disabled = loading || exporting || !renderer || !events.length;
  $("cancel-drop-preview").hidden = !previewController;
  $("pool-drop-time").textContent = !analysis
    ? "Play a track to find a moment."
    : events.length
      ? events.map(({ time }) => `${formatTime(time)}.${String(Math.round((time % 1) * 100)).padStart(2, "0")}`).join(" · ")
      : "No clear accent in this track.";
}
function syncControls() {
  const pool = settings.scene === "pool";
  updateDropControls();
  $("scene-select").value = settings.scene;
  $("scene-number").textContent = pool ? "002" : "001";
  $("stage").classList.toggle("pool-scene", pool);
  $("fur-toggle").hidden = pool;
  $("pool-material").hidden = !pool;
  $("fur-toggle").setAttribute("aria-pressed", String(settings.fur));
  $("material-label").textContent = settings.fur
    ? "WARM IVORY FUR"
    : "BURNISHED COPPER";
  $("fur-toggle").classList.toggle("fur-on", settings.fur);
  $("stage-title").textContent = pool
    ? "Light, carried by water."
    : "Every sound leaves a trace.";
  $("stage-help").textContent = pool
    ? "WASD to move · Q/E to dive/rise · Drag to look"
    : "Drag to turn · Music shapes the surface";
  $("reset-view").setAttribute(
    "aria-label",
    pool ? "Reset pool view" : "Reset sculpture view",
  );
  $("impact-help").textContent = pool
    ? "Let low notes stir the surface."
    : "Let the low end leave its mark.";
  $("resonance-help").textContent = pool
    ? "Let the music linger in the water."
    : "Hold a little more of each note.";
  $("growth-help").textContent = pool
    ? "Open the pattern into wider ripples."
    : settings.fur
      ? "A longer coat. A longer memory."
      : "Give the sound a longer memory.";
  $("impact-mapping").textContent = pool
    ? "lets low-frequency energy gently stir the water pattern."
    : "maps bass and sudden changes in loudness to the surface.";
  $("resonance-mapping").textContent =
    "blends immediate energy with a slower, lingering response.";
  $("growth-mapping").textContent = pool
    ? "widens the ripples introduced by the music."
    : "lengthens the coat and expands the musical history held in the form.";
  canvas.setAttribute(
    "aria-label",
    pool
      ? "Sunlit white-tile pool hall. Click the scene, use WASD to move, Q to dive, E to rise, and drag or use arrow keys to look around."
      : `Interactive ${settings.fur ? "furry" : "copper"} Stanford Bunny sculpture. Drag or use arrow keys to rotate.`,
  );
  ensureRenderer();
  for (const key of ["impact", "resonance", "growth"]) {
    const value = Math.round(settings[key] * 100);
    $(key).value = value;
    $(key).style.setProperty("--fill", `${value}%`);
    $(`${key}-value`).value = value;
  }
  dirty = true;
}
function updateAvailability() {
  const busy = loading || exporting;
  updateDropControls();
  if (busy || settings.scene !== "pool") stopWalking();
  $("workbench").classList.toggle("studio-busy", busy);
  $("workbench").setAttribute("aria-busy", String(busy));
  for (const id of [
    "play-button",
    "import-audio",
    "impact",
    "resonance",
    "growth",
    "reset-controls",
    "reset-view",
    "fur-toggle",
    "load-settings",
    "save-settings",
    "clip-length",
  ])
    $(id).disabled = busy || !renderer;
  $("scene-select").disabled = busy;
  $("seek").disabled = busy || !analysis;
  $("export-film").disabled =
    busy || !analysis || !renderer || !recordingSupport;
  $("cancel-export").hidden = !exporting;
  $("export-label").textContent = exporting
    ? "Recording your film…"
    : "Export film";
  if (!recordingSupport)
    $("export-note").textContent =
      "Film export needs a supported desktop browser.";
}
function updateTransport() {
  $("play-button").setAttribute(
    "aria-label",
    transport.playing ? "Pause" : analysis ? "Play" : "Play demo",
  );
  $("play-icon").innerHTML = transport.playing
    ? '<path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/>'
    : '<path d="M9 5.5 19 12 9 18.5Z" fill="currentColor"/>';
  dirty = true;
}
transport.addEventListener("change", updateTransport);
function buildWaveform() {
  if (!analysis) {
    wavePeaks = [];
    return;
  }
  const bins = 240;
  wavePeaks = Array.from({ length: bins }, (_, bin) => {
    const start = Math.floor((bin / bins) * analysis.energy.length),
      end = Math.max(
        start + 1,
        Math.floor(((bin + 1) / bins) * analysis.energy.length),
      );
    let maximum = 0;
    for (let i = start; i < end; i++)
      maximum = Math.max(maximum, analysis.energy[i] || 0);
    return maximum;
  });
}
function drawWaveform(time) {
  const width = wave.clientWidth,
    height = wave.clientHeight,
    ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (
    wave.width !== Math.round(width * ratio) ||
    wave.height !== Math.round(height * ratio)
  ) {
    wave.width = Math.round(width * ratio);
    wave.height = Math.round(height * ratio);
  }
  waveformContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  waveformContext.clearRect(0, 0, width, height);
  const bars = Math.floor(width / 4),
    progress = transport.duration ? time / transport.duration : 0;
  for (let i = 0; i < bars; i++) {
    const energy = wavePeaks.length
        ? wavePeaks[Math.floor((i / bars) * wavePeaks.length)]
        : 0,
      h = 1.5 + energy * (height - 5);
    waveformContext.fillStyle = i / bars < progress ? "#997349" : "#ccd0bf";
    waveformContext.fillRect(i * 4, (height - h) / 2, 2, h);
  }

}
async function loadTrack(file = null) {
  if (loading || exporting) return;
  if (file && file.size > 80 * 1024 * 1024) {
    status("Choose an audio file smaller than 80 MB.", true);
    return;
  }
  loading = true;
  transport.pause();
  updateAvailability();
  $("loading-overlay").hidden = false;
  $("loading-label").textContent = "Opening your track…";
  status("Listening to your track. This may take a moment.");
  try {
    // Unlock audio in the gesture, before asynchronous file I/O.
    await transport.ready();
    let bytes;
    if (file) bytes = await file.arrayBuffer();
    else {
      const response = await fetch(
        new URL("../assets/Ring_On_Your_Way.flac", import.meta.url),
      );
      if (!response.ok)
        throw new Error(
          "The demo could not be loaded. Bring your own track to start.",
        );
      bytes = await response.arrayBuffer();
    }
    const buffer = await transport.decode(bytes);
    $("loading-label").textContent = "Finding the shape of your sound…";
    const nextAnalysis = await analyzeBuffer(buffer, (progress) => {
      $("loading-label").textContent =
        `Finding the shape of your sound… ${Math.round(progress * 100)}%`;
    });
    transport.setBuffer(buffer);
    analysis = nextAnalysis;
    trackName = file ? file.name.replace(/\.[^.]+$/, "") : "Ring On Your Way";
    $("track-name").textContent = trackName;
    $("track-name").title = trackName;
    $("track-source").textContent = file
      ? "YOUR TRACK · PROCESSED ON THIS DEVICE"
      : "DEMO TRACK · FROM THE ORIGINAL SOUNDCANVAS";
    $("duration").textContent = formatTime(buffer.duration);
    $("seek").max = buffer.duration;
    lastFilm = null;
    $("download-film").hidden = true;
    buildWaveform();
    status("Your track is ready. Adjust, explore, or revisit a moment.");
    await transport.play();
  } catch (error) {
    const message = ["EncodingError", "NotSupportedError"].includes(error.name)
      ? "This audio file could not be opened. Try a WAV, MP3, FLAC, or another browser-supported format."
      : error.message ||
        "This file could not be opened. Try a different audio file.";
    status(message, true);
  } finally {
    loading = false;
    $("loading-overlay").hidden = true;
    $("audio-file").value = "";
    updateAvailability();
    dirty = true;
  }
}
async function togglePlay() {
  if (loading || exporting || !renderer) return;
  try {
    if (!analysis) await loadTrack();
    else if (transport.playing) transport.pause();
    else await transport.play();
  } catch (error) {
    status(error.message, true);
  }
}
$("play-button").addEventListener("click", togglePlay);
$("import-audio").addEventListener("click", () => $("audio-file").click());
$("audio-file").addEventListener("change", () => {
  const file = $("audio-file").files[0];
  if (file) void loadTrack(file);
});
$("seek").addEventListener("input", async () => {
  if (loading || exporting || !analysis) return;
  try {
    await transport.seek(Number($("seek").value));
    dirty = true;
  } catch (error) {
    status(error.message, true);
  }
});
for (const key of ["impact", "resonance", "growth"])
  $(key).addEventListener("input", () => {
    settings[key] = Number($(key).value) / 100;
    syncControls();
    persist();
  });
$("reset-controls").addEventListener("click", () => {
  for (const key of ["impact", "resonance", "growth"])
    settings[key] = DEFAULT_SETTINGS[key];
  syncControls();
  persist();
  status("The three controls are back at their starting point.");
});
$("scene-select").addEventListener("change", () => {
  if (loading || exporting) return;
  settings.scene = $("scene-select").value;
  drag = null;
  syncControls();
  persist();
  if (renderer)
    status(
      settings.scene === "pool"
        ? "Pool Light. Sunlight, white tile, and water."
        : "Stanford Bunny. The coat is just where you left it.",
    );
});
$("duck-toggle").addEventListener("click", () => {
  if (loading || exporting) return;
  settings.duckVisible = !settings.duckVisible;
  syncControls();
  persist();
});
$("pool-drop-toggle").addEventListener("click", () => {
  settings.poolDrop = !settings.poolDrop;
  stopWalking();
  syncControls();
  persist();
  dirty = true;
});
$("cancel-drop-preview").addEventListener("click", () =>
  previewController?.abort(),
);
$("preview-drop").addEventListener("click", async () => {
  const [event] = selectPoolDrops(analysis);
  if (!event || loading || exporting || settings.scene !== "pool") return;
  const previous = {
    time: transport.time,
    playing: transport.playing,
    view: {
      poolX: settings.poolX,
      poolZ: settings.poolZ,
      poolY: settings.poolY,
      poolPanX: settings.poolPanX,
      poolPanY: settings.poolPanY,
    },
  };
  const controller = new AbortController();
  previewController = controller;
  loading = true;
  stopWalking();
  settings.poolDrop = true;
  settings.poolX = DEFAULT_SETTINGS.poolX;
  settings.poolZ = DEFAULT_SETTINGS.poolZ;
  settings.poolY = DEFAULT_SETTINGS.poolY;
  settings.poolPanX = 0;
  settings.poolPanY = 0;
  syncControls();
  persist();
  updateAvailability();
  $("loading-overlay").hidden = false;
  $("loading-label").textContent = "Preparing the water for this moment…";
  status("Preparing a quiet drop…");
  try {
    await preparePoolDropPreview({
      transport,
      renderer,
      event,
      settings,
      analysis,
      signal: controller.signal,
    });
    status("Watch the drops meet the music.");
  } catch (error) {
    Object.assign(settings, previous.view);
    persist();
    await transport.seek(previous.time);
    if (previous.playing) await transport.play();
    status(
      error.name === "AbortError" ? "Preview cancelled." : error.message,
      error.name !== "AbortError",
    );
  } finally {
    previewController = null;
    loading = false;
    $("loading-overlay").hidden = true;
    updateAvailability();
    dirty = true;
  }
});
$("fur-toggle").addEventListener("click", () => {
  settings.fur = !settings.fur;
  syncControls();
  persist();
  status(
    settings.fur
      ? "A soft coat, moved by your music. Growth changes its length."
      : "Back to burnished copper. Click the material label to grow the coat again.",
  );
});
$("reset-view").addEventListener("click", () => {
  if (settings.scene === "pool") {
    settings.poolPanX = 0;
    settings.poolPanY = 0;
    settings.poolX = DEFAULT_SETTINGS.poolX;
    settings.poolZ = DEFAULT_SETTINGS.poolZ;
    settings.poolY = DEFAULT_SETTINGS.poolY;
  } else {
    settings.yaw = DEFAULT_SETTINGS.yaw;
    settings.pitch = DEFAULT_SETTINGS.pitch;
  }
  dirty = true;
  persist();
});
$("save-settings").addEventListener("click", () => {
  download(
    new Blob([serializeSettings(settings)], { type: "application/json" }),
    "soundcanvas-settings.json",
  );
  status("Settings saved. Bring the same track to recreate this scene.");
});
$("load-settings").addEventListener("click", () => $("settings-file").click());
$("settings-file").addEventListener("change", async () => {
  const file = $("settings-file").files[0];
  if (!file || loading || exporting) return;
  try {
    if (file.size > 100000)
      throw new Error(
        "This settings file is too large. Choose a SoundCanvas settings file.",
      );
    const loaded = parseSettings(await file.text());
    if (loading || exporting) return;
    settings = loaded;
    syncControls();
    persist();
    status(
      "Settings restored. Use the same track and playhead position to revisit your scene.",
    );
  } catch (error) {
    status(
      error instanceof SyntaxError
        ? "This is not a valid settings file."
        : error.message,
      true,
    );
  } finally {
    $("settings-file").value = "";
  }
});
canvas.addEventListener("pointerdown", (event) => {
  if (loading || exporting || !renderer) return;
  canvas.focus({ preventScroll: true });
  drag = {
    x: event.clientX,
    y: event.clientY,
    yaw: settings.yaw,
    pitch: settings.pitch,
    scene: settings.scene,
    panX: settings.poolPanX,
    panY: settings.poolPanY,
  };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!drag || loading || exporting) return;
  if (drag.scene === "pool") {
    settings.poolPanX = clamp(
      drag.panX -
        ((event.clientX - drag.x) / Math.max(1, canvas.clientWidth)) * 4,
      -3,
      3,
    );
    settings.poolPanY = clamp(
      drag.panY +
        ((event.clientY - drag.y) / Math.max(1, canvas.clientHeight)) * 20,
      -30,
      24,
    );
    dirty = true;
    return;
  }
  settings.yaw =
    ((drag.yaw - (event.clientX - drag.x) * 0.008 + Math.PI * 3) %
      (Math.PI * 2)) -
    Math.PI;
  settings.pitch = clamp(
    drag.pitch + (event.clientY - drag.y) * 0.006,
    -0.8,
    1.2,
  );
  dirty = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, () => {
    if (drag) {
      drag = null;
      persist();
    }
  });
canvas.addEventListener("keydown", (event) => {
  if (
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) ||
    loading ||
    exporting
  )
    return;
  event.preventDefault();
  if (settings.scene === "pool") {
    settings.poolPanX = clamp(
      settings.poolPanX +
        ({ ArrowLeft: -0.15, ArrowRight: 0.15 }[event.key] || 0),
      -3,
      3,
    );
    settings.poolPanY = clamp(
      settings.poolPanY + ({ ArrowUp: -0.75, ArrowDown: 0.75 }[event.key] || 0),
      -30,
      24,
    );
    dirty = true;
    persist();
    return;
  }
  settings.yaw = clamp(
    settings.yaw + ({ ArrowLeft: -0.1, ArrowRight: 0.1 }[event.key] || 0),
    -Math.PI * 2,
    Math.PI * 2,
  );
  settings.pitch = clamp(
    settings.pitch + ({ ArrowUp: 0.1, ArrowDown: -0.1 }[event.key] || 0),
    -0.8,
    1.2,
  );
  dirty = true;
  persist();
});
function stopWalking() {
  if (!walkingKeys.size) return;
  walkingKeys.clear();
  persist();
}
document.addEventListener("keydown", (event) => {
  if (
    !walkingCodes.includes(event.code) ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    loading ||
    exporting ||
    settings.scene !== "pool" ||
    $("about-dialog").open ||
    (event.target !== canvas && event.target !== document.body)
  )
    return;
  event.preventDefault();
  walkingKeys.add(event.code);
});
document.addEventListener("keyup", (event) => {
  if (walkingKeys.delete(event.code)) persist();
});
canvas.addEventListener("blur", stopWalking);
window.addEventListener("blur", stopWalking);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopWalking();
    previewController?.abort();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" &&
    !event.repeat &&
    !$("about-dialog").open &&
    (event.target === document.body || event.target === canvas)
  ) {
    event.preventDefault();
    void togglePlay();
  }
});
let dragDepth = 0;
document.addEventListener("dragover", (event) => {
  if (event.dataTransfer.types.includes("Files")) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  $("drop-overlay").hidden = true;
  if (loading || exporting) return;
  const file = event.dataTransfer.files[0];
  if (file) void loadTrack(file);
});
$("stage").addEventListener("dragenter", (event) => {
  if (!event.dataTransfer.types.includes("Files") || loading || exporting)
    return;
  event.preventDefault();
  dragDepth++;
  $("drop-overlay").hidden = false;
});
$("stage").addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $("drop-overlay").hidden = true;
});
$("export-film").addEventListener("click", async () => {
  if (!analysis || loading || exporting) return;
  try {
    clipRange(
      transport.time,
      Number($("clip-length").value),
      transport.duration,
    );
  } catch (error) {
    status(error.message, true);
    return;
  }
  exporting = true;
  exportTime = transport.time;
  exportController = new AbortController();
  $("about-dialog").close();
  updateAvailability();
  status("Recording your film. Keep this tab visible until it finishes.");
  try {
    const film = await recordFilm({
      transport,
      analysis,
      settings: { ...settings },
      seconds: Number($("clip-length").value),
      signal: exportController.signal,
      onProgress: ({ time, progress }) => {
        exportTime = time;
        dirty = true;
        $("export-label").textContent =
          `Recording · ${Math.floor(progress * 100)}%`;
      },
    });
    const safeName =
      trackName.replace(/[^\p{L}\p{N}\-_ ]/gu, "").slice(0, 70) ||
      "soundcanvas";
    lastFilm = { ...film, name: `${safeName}-soundcanvas.${film.extension}` };
    download(film.blob, lastFilm.name);
    $("download-film").hidden = false;
    status(
      `Your ${film.duration.toFixed(1)}-second film is ready, with sound. Download it again below the export button.`,
    );
  } catch (error) {
    status(
      error.name === "AbortError"
        ? "Recording cancelled. Your track is right where you left it."
        : error.message,
      error.name !== "AbortError",
    );
  } finally {
    exporting = false;
    exportController = null;
    dirty = true;
    updateAvailability();
    updateTransport();
  }
});
$("cancel-export").addEventListener("click", () => exportController?.abort());
$("download-film").addEventListener("click", () => {
  if (lastFilm) download(lastFilm.blob, lastFilm.name);
});
$("about-button").addEventListener("click", () =>
  $("about-dialog").showModal(),
);
$("close-about").addEventListener("click", () => $("about-dialog").close());
$("about-dialog").addEventListener("click", (event) => {
  if (event.target === $("about-dialog")) {
    const box = event.target.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      event.target.close();
  }
});
const resize = new ResizeObserver(() => {
  dirty = true;
});
resize.observe($("stage"));
resize.observe(wave.parentElement);
syncControls();
persist();
updateAvailability();
updateTransport();
let lastFrame = 0;
function frame(stamp) {
  requestAnimationFrame(frame);
  if (stamp - lastFrame < 1000 / 30) return;
  const elapsed = (stamp - lastFrame) / 1000;
  lastFrame = stamp;
  if (settings.scene === "pool" && !loading && !exporting && walkingKeys.size) {
    settings = movePoolCamera(settings, walkingKeys, elapsed);
    dirty = true;
  }
  if (!dirty && !transport.playing && !exporting && settings.scene !== "pool")
    return;
  const time = exporting
    ? exportTime
    : !analysis && settings.scene === "pool"
      ? Math.max(0, (stamp - (renderer?.previewStart || 0)) / 1000)
      : transport.time;
  if (renderer) {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.resize(
      Math.round(canvas.clientWidth * ratio),
      Math.round(canvas.clientHeight * ratio),
    );
    renderer.render(analysis, time, settings);
    if (settings.scene === "pool")
      $("stage-help").textContent =
        renderer.pending || renderer.settling
          ? "Settling the water…"
          : "WASD to move · Q/E to dive/rise · Drag to look";
  }
  $("current-time").textContent = formatTime(analysis ? time : 0);
  if (analysis) {
    $("seek").value = time;
    $("seek").setAttribute(
      "aria-valuetext",
      `${formatTime(time)} of ${formatTime(transport.duration)}`,
    );
  }
  drawWaveform(time);
  dirty = false;
}
requestAnimationFrame(frame);
