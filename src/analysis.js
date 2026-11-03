const CHANNELS = ["energy", "low", "mid", "high", "onset", "memory"];
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Fixed audio windows, independent of display frame rate. Crossover bands are
 * artistic control signals, not isolated instruments or semantic beat labels. */
export function analyzePCM(pcm, sampleRate, onProgress = () => {}) {
  if (!pcm.length || !Number.isFinite(sampleRate) || sampleRate < 8000)
    throw new Error("No usable audio samples.");
  const hop = Math.max(1, Math.round(sampleRate * 0.02));
  const count = Math.ceil(pcm.length / hop);
  const result = { duration: pcm.length / sampleRate, step: hop / sampleRate };
  for (const key of CHANNELS) result[key] = new Float32Array(count);
  const aLow = 1 - Math.exp((-2 * Math.PI * 220) / sampleRate);
  const aBody = 1 - Math.exp((-2 * Math.PI * 2200) / sampleRate);
  let low = 0,
    body = 0;
  for (let frame = 0; frame < count; frame++) {
    const end = Math.min(pcm.length, (frame + 1) * hop);
    let e = 0,
      l = 0,
      m = 0,
      h = 0;
    for (let i = frame * hop; i < end; i++) {
      const value = Number.isFinite(pcm[i]) ? pcm[i] : 0;
      low += aLow * (value - low);
      body += aBody * (value - body);
      e += value * value;
      l += low * low;
      m += (body - low) ** 2;
      h += (value - body) ** 2;
    }
    const n = end - frame * hop;
    result.energy[frame] = Math.sqrt(e / n);
    result.low[frame] = Math.sqrt(l / n);
    result.mid[frame] = Math.sqrt(m / n);
    result.high[frame] = Math.sqrt(h / n);
    if (frame % 250 === 0) onProgress((frame / count) * 0.8);
  }
  const sorted = [...result.energy].sort((a, b) => a - b);
  const reference = Math.max(1e-7, sorted[Math.floor((count - 1) * 0.95)]);
  let memory = 0,
    onset = 0,
    previous = 0;
  for (let i = 0; i < count; i++) {
    for (const key of ["energy", "low", "mid", "high"])
      result[key][i] = clamp(result[key][i] / reference);
    const energy = result.energy[i];
    onset = Math.max(
      clamp((energy - previous) * 3.5),
      onset * Math.exp(-result.step / 0.11),
    );
    memory += (energy - memory) * (1 - Math.exp(-result.step / 1.8));
    result.onset[i] = onset;
    result.memory[i] = memory;
    previous = energy;
  }
  onProgress(1);
  return result;
}

export function sampleFeatures(analysis, time) {
  if (!analysis)
    return { energy: 0, low: 0, mid: 0, high: 0, onset: 0, memory: 0 };
  const position =
    clamp(Number.isFinite(time) ? time : 0, 0, analysis.duration) /
    analysis.step;
  const left = Math.min(analysis.energy.length - 1, Math.floor(position));
  const right = Math.min(analysis.energy.length - 1, left + 1);
  const mix = Math.min(1, position - left);
  return Object.fromEntries(
    CHANNELS.map((key) => [
      key,
      analysis[key][left] * (1 - mix) + analysis[key][right] * mix,
    ]),
  );
}
