import test from "node:test";
import assert from "node:assert/strict";
import { analyzePCM } from "../src/analysis.js";
import { DEFAULT_SETTINGS } from "../src/model.js";
import { earthFrame } from "../src/earth-motion.js";

const rate = 12000;
const tone = (hz, gain = 0.5) =>
  Float32Array.from(
    { length: rate * 2 },
    (_, index) => gain * Math.sin((index * Math.PI * 2 * hz) / rate),
  );
const samples = new Float32Array([
  1, 0, 0, 0.25, 0.1, 0.1,
  0.7, 0.2, 0.68, 0.5, 0.4, 0.5,
  0, 0.4, 0.92, 0.75, 0.8, 0.9,
]);

test("silence keeps a finite readable base field", () => {
  const frame = earthFrame(
    analyzePCM(new Float32Array(rate), rate),
    0.5,
    DEFAULT_SETTINGS,
    samples,
  );
  assert.ok(frame.scale >= 1 && frame.scale <= 1.03);
  assert.ok(frame.rim >= 0 && frame.rim <= 1);
  assert.equal(frame.heights.length, 3);
  assert.ok(frame.heights.some((height) => height > 0));
  assert.ok([...frame.heights, ...frame.tips].every(Number.isFinite));
});

test("frequency bands act at different scales and stay bounded", () => {
  const bass = earthFrame(
    analyzePCM(tone(90), rate),
    1.2,
    DEFAULT_SETTINGS,
    samples,
  );
  const mid = earthFrame(
    analyzePCM(tone(900), rate),
    1.2,
    DEFAULT_SETTINGS,
    samples,
  );
  const high = earthFrame(
    analyzePCM(tone(3800), rate),
    1.2,
    DEFAULT_SETTINGS,
    samples,
  );
  assert.ok(bass.scale > mid.scale);
  assert.ok(Math.max(...mid.heights) > Math.max(...bass.heights));
  assert.ok(Math.max(...high.tips) > Math.max(...mid.tips));
  for (const frame of [bass, mid, high]) {
    assert.ok(frame.scale <= 1.03);
    assert.ok(frame.heights.every((value) => value >= 0 && value <= 0.42));
    assert.ok(frame.tips.every((value) => value >= 0 && value <= 1));
  }
});

test("seeking is deterministic and controls have visible effects", () => {
  const analysis = analyzePCM(tone(700), rate);
  const first = earthFrame(analysis, 0.85, DEFAULT_SETTINGS, samples);
  earthFrame(analysis, 1.6, DEFAULT_SETTINGS, samples);
  assert.deepEqual(
    earthFrame(analysis, 0.85, DEFAULT_SETTINGS, samples),
    first,
  );
  const changed = earthFrame(
    analysis,
    0.85,
    { ...DEFAULT_SETTINGS, impact: 1, resonance: 1, growth: 1 },
    samples,
  );
  assert.notDeepEqual(changed.heights, first.heights);
});
