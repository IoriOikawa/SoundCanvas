import test from "node:test";
import assert from "node:assert/strict";
import { getFurParameters } from "../src/fur.js";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
} from "../src/model.js";
import { analyzePCM } from "../src/analysis.js";

test("idle fur has a bounded coat and no invented audio movement", () => {
  const fur = getFurParameters(null, 0, DEFAULT_SETTINGS);
  assert.ok(fur.length > 0 && fur.length < 0.3);
  assert.ok(fur.layers >= 12 && fur.layers <= 32);
  assert.equal(fur.sway, 0);
  const silent = analyzePCM(new Float32Array(12000), 12000);
  assert.deepEqual(
    getFurParameters(silent, 0.2, DEFAULT_SETTINGS),
    getFurParameters(silent, 0.8, DEFAULT_SETTINGS),
  );
});
test("coat toggle returns one smooth surface and survives saved settings", () => {
  const settings = { ...DEFAULT_SETTINGS, fur: false };
  assert.equal(getFurParameters(null, 0, settings).layers, 1);
  assert.equal(getFurParameters(null, 0, settings).length, 0);
  assert.equal(parseSettings(serializeSettings(settings)).fur, false);
  assert.equal(parseSettings('{"version":1,"settings":{}}').fur, true);
  assert.throws(
    () => parseSettings('{"version":1,"settings":{"fur":"yes"}}'),
    /fur/,
  );
});
test("growth lengthens the coat and music moves it deterministically", () => {
  const pcm = Float32Array.from(
    { length: 12000 },
    (_, i) => 0.5 * Math.sin((i * 2 * Math.PI * 90) / 12000),
  );
  const audio = analyzePCM(pcm, 12000);
  const short = getFurParameters(audio, 0.5, {
    ...DEFAULT_SETTINGS,
    growth: 0,
  });
  const long = getFurParameters(audio, 0.5, { ...DEFAULT_SETTINGS, growth: 1 });
  assert.ok(long.length > short.length);
  assert.ok(long.sway > 0);
  assert.deepEqual(
    getFurParameters(audio, 0.5, DEFAULT_SETTINGS),
    getFurParameters(audio, 0.5, DEFAULT_SETTINGS),
  );
});
