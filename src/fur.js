import { sampleFeatures } from "./analysis.js?v=signal-aa-1";

/** Stable shell coat parameters. No wall-clock simulation state is accumulated. */
export function getFurParameters(analysis, time, settings) {
  if (settings.fur === false) return { length: 0, sway: 0, layers: 1 };
  const sound = sampleFeatures(analysis, time);
  const held =
    sound.energy * (1 - settings.resonance) + sound.memory * settings.resonance;
  return {
    length:
      (0.11 + settings.growth * 0.1) *
      (1 + settings.impact * sound.onset * 0.12),
    sway:
      (held * 0.25 + sound.low * 0.3 + sound.onset * 0.25) * settings.impact,
    layers: 24,
  };
}
