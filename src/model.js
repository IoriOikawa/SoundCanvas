import { sampleFeatures } from "./analysis.js?v=signal-aa-1";
import { BUNNY_POSITIONS, BUNNY_INDICES } from "./bunny-data.js?v=signal-aa-1";

export const DEFAULT_SETTINGS = Object.freeze({
  impact: 0.55,
  resonance: 0.62,
  growth: 0.58,
  yaw: 2.2,
  pitch: 0.2,
  seed: 17,
  fur: true,
  scene: "pool",
  poolDrop: true,
  duckVisible: true,
  rainBackground: "garden",
  rainLightning: true,
  poolPanX: 0,
  poolPanY: 0,
  poolX: -0.45,
  poolZ: -1.35,
  poolY: 1.05,
});
export const clamp = (v, low = 0, high = 1) => Math.min(high, Math.max(low, v));
export const formatTime = (seconds) =>
  `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`;

export function parseSettings(json) {
  const data = JSON.parse(json);
  if (
    !data ||
    data.version !== 1 ||
    !data.settings ||
    typeof data.settings !== "object" ||
    Array.isArray(data.settings)
  )
    throw new Error("This is not a supported SoundCanvas settings file.");
  const settings = { ...DEFAULT_SETTINGS };
  // Settings exported before scene selection describe the bunny.
  if (data.settings.scene === undefined) settings.scene = "bunny";
  for (const key of Object.keys(settings)) {
    if (data.settings[key] === undefined) continue;
    const value = data.settings[key];
    if (key === "scene") {
      if (!["pool", "bunny", "rain", "signal"].includes(value))
        throw new Error("Invalid scene setting.");
      settings.scene = value;
      continue;
    }
    if (key === "rainBackground") {
      if (!["garden", "dusk", "night"].includes(value)) throw new Error("Invalid rain background.");
      settings[key] = value;
      continue;
    }
    if (key === "fur" || key === "poolDrop" || key === "duckVisible" || key === "rainLightning") {
      if (typeof value !== "boolean")
        throw new Error(`Invalid ${key} setting.`);
      settings[key] = value;
      continue;
    }
    const [low, high] =
      key === "poolX"
        ? [-4.15, 4.15]
        : key === "poolZ"
          ? [-3.25, 24.25]
          : key === "poolY"
            ? [-0.9, 1.05]
            : key === "poolPanY"
              ? [-30, 24]
              : key === "poolPanX"
            ? [-3, 3]
            : key === "yaw"
              ? [-Math.PI * 2, Math.PI * 2]
              : key === "pitch"
                ? [-0.8, 1.2]
                : key === "seed"
                  ? [0, 99999]
                  : [0, 1];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < low ||
      value > high
    )
      throw new Error(`Invalid ${key} setting.`);
    settings[key] = value;
  }
  return settings;
}

export function serializeSettings(settings) {
  return JSON.stringify(
    {
      version: 1,
      name:
        settings.scene === "signal" ? "SoundCanvas · Signal Lines" : settings.scene === "rain" ? "SoundCanvas · Rain Window" : settings.scene === "pool"
          ? "SoundCanvas · Pool Light"
          : "SoundCanvas · Stanford Bunny",
      settings,
    },
    null,
    2,
  );
}

export function clipRange(start, requested, total) {
  if (
    ![start, requested, total].every(Number.isFinite) ||
    requested <= 0 ||
    total <= 0
  )
    throw new Error("Choose a valid clip length.");
  start = clamp(start, 0, total);
  const duration = Math.min(requested, total - start);
  if (duration < 0.25)
    throw new Error("Move the playhead earlier to export a clip.");
  return { start, duration };
}

/** Area-weighted smooth normals for the original or deformed bunny. */
function meshNormals(positions) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < BUNNY_INDICES.length; i += 3) {
    const a = BUNNY_INDICES[i] * 3,
      b = BUNNY_INDICES[i + 1] * 3,
      c = BUNNY_INDICES[i + 2] * 3;
    const ux = positions[b] - positions[a],
      uy = positions[b + 1] - positions[a + 1],
      uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a],
      vy = positions[c + 1] - positions[a + 1],
      vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const at of [a, b, c]) {
      normals[at] += nx;
      normals[at + 1] += ny;
      normals[at + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  return normals;
}
const restNormals = meshNormals(BUNNY_POSITIONS);

/** Subtle, time-indexed surface displacement preserves the scan's silhouette.
 * All motion derives from music time; seeking reconstructs exactly the same mesh. */
export function buildSculpture(analysis, time, settings) {
  if (!analysis)
    return {
      positions: BUNNY_POSITIONS,
      normals: restNormals,
      indices: BUNNY_INDICES,
    };
  const now = sampleFeatures(analysis, time);
  const historyLength = 4 + settings.growth * 28;
  const bands = Array.from({ length: 16 }, (_, i) =>
    sampleFeatures(analysis, time - (i / 15) * historyLength),
  );
  const positions = new Float32Array(BUNNY_POSITIONS.length);
  const phase = settings.seed * 0.17;
  for (let at = 0; at < positions.length; at += 3) {
    const x = BUNNY_POSITIONS[at],
      y = BUNNY_POSITIONS[at + 1],
      z = BUNNY_POSITIONS[at + 2];
    const height = clamp((y + 1.9) / 3.8);
    const history = bands[Math.min(15, Math.floor(height * 16))];
    const energy =
      history.energy * (1 - settings.resonance) +
      history.memory * settings.resonance;
    const wave = Math.sin(x * 6 + y * 8 + z * 4 - time * 2.6 + phase);
    const ripple =
      wave * energy * (0.012 + 0.045 * settings.growth) +
      settings.impact *
        (history.low * 0.035 + now.onset * 0.045) *
        Math.sin(y * 5 + x * 3 + phase);
    const swell =
      1 + settings.impact * now.low * 0.045 + settings.growth * energy * 0.015;
    const ears = clamp((height - 0.64) / 0.36) ** 2;
    positions[at] =
      x * swell +
      restNormals[at] * ripple +
      ears * history.mid * 0.06 * settings.impact * Math.sin(time * 2 + z);
    positions[at + 1] = y + restNormals[at + 1] * ripple;
    positions[at + 2] = z * swell + restNormals[at + 2] * ripple;
  }
  return { positions, normals: meshNormals(positions), indices: BUNNY_INDICES };
}
