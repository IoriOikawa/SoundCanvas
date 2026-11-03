import test from "node:test";
import assert from "node:assert/strict";
import {
  waterDrop,
  waterSeedDrops,
  waterFrame,
} from "../src/water-timeline.js";
import { DEFAULT_SETTINGS } from "../src/model.js";
test("water inputs are repeatable at a fixed audio frame, with bounded local disturbances", () => {
  const a = waterSeedDrops(DEFAULT_SETTINGS);
  assert.deepEqual(a, waterSeedDrops(DEFAULT_SETTINGS));
  assert.equal(a.length, 20);
  for (let frame = 0; frame < 36000; frame += 12) {
    const d = waterDrop(null, frame, DEFAULT_SETTINGS);
    assert.deepEqual(d, waterDrop(null, frame, DEFAULT_SETTINGS));
    assert.ok(Math.abs(d.x) < 1 && Math.abs(d.y) < 1);
    assert.ok(d.radius > 0 && d.radius < 0.1 && Math.abs(d.strength) < 0.02);
  }
  assert.equal(waterFrame(1), 60);
  assert.equal(waterFrame(-3), 0);
});
test("changing impact responds to music without driving silence harder", () => {
  const silent = waterDrop(null, 12, { ...DEFAULT_SETTINGS, impact: 1 });
  assert.deepEqual(
    silent,
    waterDrop(null, 12, { ...DEFAULT_SETTINGS, impact: 0 }),
  );
});
