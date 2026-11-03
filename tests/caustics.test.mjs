import test from "node:test";
import assert from "node:assert/strict";
import { waterDrop } from "../src/water-timeline.js";
const getCausticParameters = (analysis, time, settings) =>
  waterDrop(analysis, Math.round(time * 60), settings);
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
} from "../src/model.js";
import { analyzePCM } from "../src/analysis.js";

test("pool light has a calm finite baseline with no audio", () => {
  const values = getCausticParameters(null, 0, DEFAULT_SETTINGS);
  assert.ok(Object.values(values).every(Number.isFinite));
  assert.ok(Math.abs(values.strength) > 0 && Math.abs(values.strength) < 0.02);
  assert.ok(values.radius > 0);
});
test("music changes light gently and seeking reproduces parameters", () => {
  const pcm = Float32Array.from(
    { length: 12000 },
    (_, i) => 0.5 * Math.sin((i * 2 * Math.PI * 90) / 12000),
  );
  const sound = analyzePCM(pcm, 12000);
  const a = getCausticParameters(sound, 0.5, DEFAULT_SETTINGS);
  getCausticParameters(sound, 0.8, DEFAULT_SETTINGS);
  assert.deepEqual(getCausticParameters(sound, 0.5, DEFAULT_SETTINGS), a);
  assert.ok(
    Math.abs(a.strength) >
      Math.abs(getCausticParameters(null, 0.5, DEFAULT_SETTINGS).strength),
  );
  assert.ok(Math.abs(a.strength) < 0.02);
});
test("growth opens the pattern into wider ripples and pan is bounded in settings", () => {
  const small = getCausticParameters(null, 0, {
    ...DEFAULT_SETTINGS,
    growth: 0,
  });
  const large = getCausticParameters(null, 0, {
    ...DEFAULT_SETTINGS,
    growth: 1,
  });
  assert.ok(large.radius > small.radius);
  assert.throws(() =>
    parseSettings('{"version":1,"settings":{"poolPanX":50}}'),
  );
});
test("scene selection survives files and old bunny files remain bunny files", () => {
  for (const scene of ["pool", "bunny"])
    assert.equal(
      parseSettings(serializeSettings({ ...DEFAULT_SETTINGS, scene })).scene,
      scene,
    );
  assert.equal(
    parseSettings('{"version":1,"settings":{"impact":0.5}}').scene,
    "bunny",
  );
  assert.throws(
    () => parseSettings('{"version":1,"settings":{"scene":"bad"}}'),
    /scene/,
  );
});
