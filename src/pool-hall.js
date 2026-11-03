const normalize = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const POOL_SUN = Object.freeze(normalize([-0.75, 0.625, 0.21875]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const abovePool = (x, z) => Math.abs(x) <= 3.6 && z >= 0.1 && z <= 23.9;
const deckClearance = 0.22;

/** View from the near pool edge. Existing saved pan values become a bounded
 * look direction; the viewer never orbits outside the building. */
export function poolHallCamera(settings) {
  const yaw = Math.max(-3, Math.min(3, settings.poolPanX || 0)) * 0.13;
  const pitch =
    clamp(-0.185 - (settings.poolPanY || 0) * 0.055, -1.48, 1.48);
  const forward = normalize([
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ]);
  const right = normalize(cross([0, 1, 0], forward));
  const x = settings.poolX ?? -0.45;
  const z = settings.poolZ ?? -1.35;
  const y = clamp(settings.poolY ?? 1.05, abovePool(x, z) ? -0.9 : deckClearance, 1.05);
  return {
    eye: [x, y, z],
    forward,
    right,
    up: normalize(cross(forward, right)),
  };
}

/** Move horizontally relative to the view, with independent depth control. */
export function movePoolCamera(settings, keys, seconds) {
  const ahead = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  const sideways = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const vertical = Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));
  if (!ahead && !sideways && !vertical) return settings;

  const { eye, forward, right } = poolHallCamera(settings);
  const elapsed = clamp(seconds, 0, 0.1);
  const flat = Math.hypot(forward[0], forward[2]);
  const distance = 1.8 * elapsed / Math.max(1, Math.hypot(ahead, sideways));
  let x = clamp(eye[0] + (ahead * forward[0] / flat + sideways * right[0]) * distance, -4.15, 4.15);
  let z = clamp(eye[2] + (ahead * forward[2] / flat + sideways * right[2]) * distance, -3.25, 24.25);
  const y = clamp(eye[1] + vertical * 0.85 * elapsed, abovePool(eye[0], eye[2]) ? -0.9 : deckClearance, 1.05);
  if (y < deckClearance) {
    x = clamp(x, -3.6, 3.6);
    z = clamp(z, 0.1, 23.9);
  }
  return { ...settings, poolX: x, poolY: y, poolZ: z };
}
