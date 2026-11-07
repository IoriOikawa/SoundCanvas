import { EARTH_SAMPLES } from "./earth-data.js?v=earth-1";
import { clamp } from "./model.js?v=earth-1";

const fract = (value) => value - Math.floor(value);
const cyclicDistance = (a, b) => {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
};

function smoothFeature(analysis, key, time, seconds) {
  if (!analysis?.[key]?.length) return 0;
  const end = Math.min(
    analysis[key].length - 1,
    Math.max(0, Math.round(time / analysis.step)),
  );
  const frames = Math.max(1, Math.round(seconds / analysis.step));
  let sum = 0;
  let weight = 0;
  for (let offset = 0; offset <= frames; offset++) {
    const sampleWeight = Math.exp(
      -offset / Math.max(1, frames * 0.38),
    );
    sum += analysis[key][Math.max(0, end - offset)] * sampleWeight;
    weight += sampleWeight;
  }
  return clamp(sum / weight);
}

export function earthFrame(
  analysis,
  time,
  settings,
  samples = EARTH_SAMPLES,
) {
  const release = 0.035 + settings.resonance * 0.32;
  const low = smoothFeature(analysis, "low", time, release * 1.4);
  const mid = smoothFeature(analysis, "mid", time, release);
  const high = smoothFeature(
    analysis,
    "high",
    time,
    0.035 + release * 0.25,
  );
  const onset = smoothFeature(
    analysis,
    "onset",
    time,
    0.045 + release * 0.12,
  );
  const count = samples.length / 6;
  const heights = new Float32Array(count);
  const tips = new Float32Array(count);
  const wavePosition = fract(time * 0.17);
  const densityLimit = 0.44 + settings.growth * 0.56;
  for (let sample = 0; sample < count; sample++) {
    const at = sample * 6;
    const row = samples[at + 3];
    const phase = samples[at + 4];
    const density = samples[at + 5];
    if (density > densityLimit) continue;
    const region =
      0.68 +
      0.32 * Math.sin(time * 0.62 + phase * Math.PI * 2 + row * 2.1);
    const sparkle =
      0.5 + 0.5 * Math.sin(time * 5.1 + phase * 31.7);
    const distance = cyclicDistance(row, wavePosition);
    const wave = Math.exp(-(distance * distance) / 0.0065) * onset;
    const base = 0.018 + settings.growth * 0.028;
    heights[sample] = clamp(
      base +
        settings.impact *
          (mid * region * 0.35 +
            high * sparkle * 0.065 +
            wave * 0.16),
      0,
      0.46,
    );
    tips[sample] = clamp(high * (0.25 + sparkle * 0.75) + wave);
  }
  return {
    low,
    scale: 1 + clamp(low * (0.01 + settings.impact * 0.02), 0, 0.03),
    rim: clamp(0.18 + low * 0.42 + onset * 0.22),
    heights,
    tips,
  };
}
