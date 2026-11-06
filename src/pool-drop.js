import { abortable } from "./abort.js?v=signal-aa-1";
import { WATER_SURFACE } from "./water-surface.js?v=signal-aa-1";
const selected = new WeakMap();
export const MAX_POOL_BALLS = 3;
const minimumDropGap = 5;
const poolLandingSpots = [[0.55, 5.2], [-0.95, 6.8], [2.25, 8.4]];
const noDrops = Object.freeze([]);
/** Isolated audible transients, with room for the fall and settling tail. */
export function selectPoolDrops(analysis) {
  if (!analysis) return noDrops;
  if (selected.has(analysis)) return selected.get(analysis);
  const candidates = [];
  for (let i = 1; i < analysis.onset.length - 1; i++) {
    const time = i * analysis.step,
      onset = analysis.onset[i],
      energy = analysis.energy[i];
    if (
      time < 1 ||
      time > analysis.duration - 2.3 ||
      energy < 0.08 ||
      onset < 0.16 ||
      onset < analysis.onset[i - 1] ||
      onset <= analysis.onset[i + 1]
    )
      continue;
    const value = onset * (0.65 + 0.2 * energy + 0.15 * analysis.low[i]);
    candidates.push({ time, strength: Math.min(1, value), score: value });
  }
  candidates.sort((a, b) => b.score - a.score || a.time - b.time);
  const chosen = [];
  for (const candidate of candidates) {
    if (chosen.every(({ time }) => Math.abs(candidate.time - time) >= minimumDropGap))
      chosen.push(candidate);
    if (chosen.length === MAX_POOL_BALLS) break;
  }
  const events = chosen.sort((a, b) => a.time - b.time).map(({ time, strength }, index) => {
    const [x, z] = poolLandingSpots[index];
    return Object.freeze({ time, strength, x, z, radius: 0.24 });
  });
  selected.set(analysis, Object.freeze(events));
  return events;
}
export function selectPoolDrop(analysis) {
  return selectPoolDrops(analysis).reduce(
    (best, event) => !best || event.strength > best.strength ? event : best, null,
  );
}
export function poolBallState(event, time) {
  if (!event) return null;
  const lead = 0.7,
    elapsed = time - (event.time - lead);
  if (elapsed < 0) return null;
  const r = event.radius,
    g = 9.81;
  let y;
  if (time === event.time) y = r;
  else if (time < event.time)
    y = r + 0.5 * g * (lead * lead - elapsed * elapsed);
  else {
    const t = time - event.time,
      tau = 0.06,
      terminal = 0.32;
    y = Math.max(
      WATER_SURFACE.floor + r,
      r - terminal * t - (g * lead - terminal) * tau * (1 - Math.exp(-t / tau)),
    );
  }
  return { center: [event.x, y, event.z], radius: r };
}
export function poolBallUniform(event, time) {
  const state = poolBallState(event, time);
  return state ? [...state.center, state.radius] : [0, 0, 0, 0];
}
export function poolBallUniforms(events, time) {
  const uniforms = {};
  for (let index = 0; index < MAX_POOL_BALLS; index++) {
    uniforms[`ballSpheres[${index}]`] = poolBallUniform(events[index], time);
  }
  return uniforms;
}
export function submergedBallVolume(y, radius) {
  const h = Math.min(2 * radius, Math.max(0, radius - y));
  return Math.PI * h * h * (radius - h / 3);
}

export async function preparePoolDropPreview({
  transport,
  renderer,
  event,
  settings,
  analysis,
  signal,
}) {
  if (signal?.aborted)
    throw new DOMException("Preview cancelled.", "AbortError");
  const start = Math.max(0, event.time - 0.95);
  transport.pause();
  await transport.seek(start);
  await abortable(renderer.prepare(analysis, start, settings, signal), signal);
  if (signal?.aborted)
    throw new DOMException("Preview cancelled.", "AbortError");
  await transport.play();
}
