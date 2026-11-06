import { sampleFeatures } from "./analysis.js?v=signal-aa-1";
export const waterFrame = (time) => Math.max(0, Math.floor(time * 60 + 1e-6));
function random(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export function waterSeedDrops(settings) {
  return Array.from({ length: 20 }, (_, i) => ({
    x: random(settings.seed + i * 3) * 1.8 - 0.9,
    y: random(settings.seed + i * 3 + 1) * 1.8 - 0.9,
    radius: 0.03,
    strength: i % 2 ? 0.01 : -0.01,
  }));
}
// Local impulses drive a heightfield. The image is never warped as a whole.
export function waterDrop(analysis, frame, settings) {
  const sound = sampleFeatures(analysis, frame / 60);
  const held =
    sound.energy * (1 - settings.resonance) + sound.memory * settings.resonance;
  const n = frame / 12 + settings.seed * 41;
  return {
    x: random(n) * 1.8 - 0.9,
    y: random(n + 31) * 1.8 - 0.9,
    radius: 0.018 + settings.growth * 0.025,
    strength:
      (frame % 24 ? -1 : 1) *
      (0.003 +
        settings.impact * (sound.low * 0.004 + sound.onset * 0.008) +
        held * 0.002),
  };
}
