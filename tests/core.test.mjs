import test from "node:test";
import assert from "node:assert/strict";
import { analyzePCM, sampleFeatures } from "../src/analysis.js";
import { BUNNY_POSITIONS, BUNNY_INDICES } from "../src/bunny-data.js";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
  clipRange,
  buildSculpture,
  formatTime,
} from "../src/model.js";

const rate = 12000;
const tone = (hz, seconds = 1) =>
  Float32Array.from(
    { length: rate * seconds },
    (_, i) => 0.5 * Math.sin((i * 2 * Math.PI * hz) / rate),
  );
const mean = (a) => a.reduce((sum, v) => sum + v, 0) / a.length;

test("silence produces finite, genuinely silent features", () => {
  const result = analyzePCM(new Float32Array(rate), rate);
  for (const key of ["energy", "low", "mid", "high", "onset", "memory"]) {
    assert.ok(
      result[key].every((v) => Number.isFinite(v) && v === 0),
      key,
    );
  }
  assert.equal(sampleFeatures(result, 0.5).energy, 0);
});

test("features distinguish a bass tone from an air tone", () => {
  const bass = sampleFeatures(analyzePCM(tone(90), rate), 0.7);
  const air = sampleFeatures(analyzePCM(tone(3600), rate), 0.7);
  assert.ok(bass.low > bass.high * 3, JSON.stringify(bass));
  assert.ok(air.high > air.low * 3, JSON.stringify(air));
});

test("transients generate an onset that decays after a burst", () => {
  const pcm = new Float32Array(rate);
  pcm.set(tone(1500, 0.05), (rate / 3) | 0);
  const result = analyzePCM(pcm, rate);
  assert.ok(Math.max(...result.onset) > 0.3);
  assert.ok(sampleFeatures(result, 0.9).onset < 0.05);
});

test("sampling clamps time and remains repeatable after arbitrary seeks", () => {
  const result = analyzePCM(tone(300), rate);
  const middle = sampleFeatures(result, 0.425);
  sampleFeatures(result, 0.9);
  assert.deepEqual(sampleFeatures(result, 0.425), middle);
  assert.deepEqual(sampleFeatures(result, -5), sampleFeatures(result, 0));
  assert.deepEqual(
    sampleFeatures(result, 500),
    sampleFeatures(result, result.duration),
  );
  assert.throws(() => analyzePCM(new Float32Array(0), rate));
});

test("analysis remains bounded for quiet material and loud input", () => {
  for (const gain of [0.0001, 5]) {
    const result = analyzePCM(
      tone(500).map((v) => v * gain),
      rate,
    );
    assert.ok(mean(result.energy) > 0);
    for (const key of ["energy", "low", "mid", "high", "onset", "memory"]) {
      assert.ok(result[key].every((v) => v >= 0 && v <= 1));
    }
  }
});

test("settings roundtrip preserves controls, camera and seed", () => {
  const settings = { ...DEFAULT_SETTINGS, impact: 0.82, yaw: -0.2, seed: 27 };
  const loaded = parseSettings(serializeSettings(settings));
  assert.deepEqual(loaded, settings);
  assert.throws(() => parseSettings('{"version":99}'));
  assert.throws(() =>
    parseSettings('{"version":1,"settings":{"impact":"bad"}}'),
  );
  assert.throws(() => parseSettings('{"version":1,"settings":{"impact":2}}'));
});

test("Dancing Earth settings roundtrip with the correct export title", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    scene: "earth",
    yaw: 1.1,
    pitch: -0.15,
  };
  assert.deepEqual(parseSettings(serializeSettings(settings)), settings);
  assert.equal(
    JSON.parse(serializeSettings(settings)).name,
    "SoundCanvas · Dancing Earth",
  );
});

test("export ranges respect the song and reject unusable clips", () => {
  assert.deepEqual(clipRange(9, 15, 12), { start: 9, duration: 3 });
  assert.deepEqual(clipRange(-5, 30, 12), { start: 0, duration: 12 });
  assert.throws(() => clipRange(12, 15, 12));
  assert.throws(() => clipRange(0, NaN, 12));
  assert.equal(formatTime(125.9), "02:05");
});

test("unrelated JSON gets a clear settings-file error", () => {
  assert.throws(() => parseSettings("null"), /not a supported SoundCanvas/);
  assert.throws(
    () => parseSettings('{"version":1,"settings":[]}'),
    /not a supported SoundCanvas/,
  );
});

test("sculpture is finite and deterministic across seeking", () => {
  const analysis = analyzePCM(tone(90), rate);
  const first = buildSculpture(analysis, 0.45, DEFAULT_SETTINGS);
  buildSculpture(analysis, 0.9, DEFAULT_SETTINGS);
  const again = buildSculpture(analysis, 0.45, DEFAULT_SETTINGS);
  assert.deepEqual(first.positions, again.positions);
  assert.equal(first.positions.length, BUNNY_POSITIONS.length);
  assert.deepEqual(first.indices, BUNNY_INDICES);
  assert.ok(first.positions.every(Number.isFinite));
  assert.ok(first.normals.every(Number.isFinite));
  assert.ok(first.indices.every((v) => v < first.positions.length / 3));
  const changed = buildSculpture(analysis, 0.45, {
    ...DEFAULT_SETTINGS,
    impact: 1,
    growth: 1,
  });
  assert.notDeepEqual(changed.positions, first.positions);
});

test("idle and silent audio preserve the recognizable bunny mesh", () => {
  const idle = buildSculpture(null, 0, DEFAULT_SETTINGS);
  const silent = analyzePCM(new Float32Array(rate), rate);
  assert.equal(idle.positions.length, BUNNY_POSITIONS.length);
  assert.deepEqual(idle.positions, BUNNY_POSITIONS);
  assert.deepEqual(
    buildSculpture(silent, 0.5, DEFAULT_SETTINGS).positions,
    BUNNY_POSITIONS,
  );
  const snapshot = BUNNY_POSITIONS.slice();
  buildSculpture(analyzePCM(tone(90), rate), 0.5, {
    ...DEFAULT_SETTINGS,
    impact: 1,
  });
  assert.deepEqual(BUNNY_POSITIONS, snapshot);
});
