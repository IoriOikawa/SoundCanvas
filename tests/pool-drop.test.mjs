import test from "node:test";
import assert from "node:assert/strict";
import * as drop from "../src/pool-drop.js";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
} from "../src/model.js";
function analysis() {
  return {
    duration: 10,
    step: 0.1,
    energy: new Float32Array(101).fill(0.6),
    low: new Float32Array(101).fill(0.5),
    onset: new Float32Array(101),
  };
}
test("one isolated accent is selected and quiet sustained music never forces a throw", () => {
  const a = analysis();
  a.onset[2] = 1;
  a.onset[40] = 0.7;
  a.onset[60] = 0.95;
  a.onset[96] = 1;
  assert.equal(drop.selectPoolDrop(a).time, 6);
  assert.equal(drop.selectPoolDrop(analysis()), null);
  assert.equal(drop.selectPoolDrop(null), null);
});
test("sphere first touches water on the accent and deterministically settles above the floor", () => {
  const event = { time: 6, strength: 1, x: 0.55, z: 5.2, radius: 0.24 };
  assert.equal(drop.poolBallState(event, 4), null);
  const at = drop.poolBallState(event, 6),
    before = drop.poolBallState(event, 5.9),
    after = drop.poolBallState(event, 6.1);
  assert.ok(Math.abs(at.center[1] - event.radius) < 1e-10);
  assert.ok(before.center[1] > at.center[1] && after.center[1] < at.center[1]);
  assert.equal(drop.submergedBallVolume(at.center[1], event.radius), 0);
  assert.ok(drop.submergedBallVolume(after.center[1], event.radius) > 0);
  assert.ok(drop.poolBallState(event, 20).center[1] >= -1.05 + event.radius);
  drop.poolBallState(event, 18);
  assert.deepEqual(drop.poolBallState(event, 6.1), after);
});
test("pure-water toggle roundtrips and ball uniforms hide absent events", () => {
  assert.deepEqual(drop.poolBallUniform(null, 4), [0, 0, 0, 0]);
  for (const poolDrop of [true, false])
    assert.equal(
      parseSettings(serializeSettings({ ...DEFAULT_SETTINGS, poolDrop }))
        .poolDrop,
      poolDrop,
    );
  assert.throws(() => parseSettings('{"version":1,"settings":{"poolDrop":1}}'));
});

test("preview waits for reconstructed water before starting music", async () => {
  const calls = [];
  let finish;
  const transport = {
    pause() {
      calls.push("pause");
    },
    async seek(t) {
      calls.push(["seek", t]);
    },
    async play() {
      calls.push("play");
    },
  };
  const renderer = {
    prepare() {
      calls.push("prepare");
      return new Promise((r) => (finish = r));
    },
  };
  const pending = drop.preparePoolDropPreview({
    transport,
    renderer,
    event: { time: 30 },
    settings: {},
  });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls, ["pause", ["seek", 29.05], "prepare"]);
  finish();
  await pending;
  assert.equal(calls.at(-1), "play");
});
test("preview cancellation does not wait indefinitely or start playback", async () => {
  const controller = new AbortController();
  let plays = 0;
  const promise = drop.preparePoolDropPreview({
    transport: {
      pause() {},
      async seek() {},
      async play() {
        plays++;
      },
    },
    renderer: { prepare: () => new Promise(() => {}) },
    event: { time: 30 },
    settings: {},
    signal: controller.signal,
  });
  await new Promise((r) => setImmediate(r));
  controller.abort();
  await assert.rejects(promise, { name: "AbortError" });
  assert.equal(plays, 0);
});

test("drop schedule spaces strong accents and keeps landed balls visible", () => {
  const track = {
    duration: 24,
    step: 0.1,
    onset: new Float32Array(240),
    energy: new Float32Array(240).fill(0.6),
    low: new Float32Array(240).fill(0.5),
  };
  for (const [frame, score] of [[20, 0.9], [30, 0.8], [90, 0.7], [160, 0.6], [210, 0.5]]) {
    track.onset[frame] = score;
  }
  const events = drop.selectPoolDrops(track);
  assert.deepEqual(events.map(event => event.time), [2, 9, 16]);
  assert.equal(new Set(events.map(event => event.x)).size, 3);
  const duringFirst = drop.poolBallUniforms(events, 3);
  assert.equal(duringFirst["ballSpheres[1]"][3], 0);
  const settled = drop.poolBallUniforms(events, 23);
  for (const sphere of Object.values(settled)) {
    assert.equal(sphere[3], 0.24);
    assert.equal(sphere[1], -0.81);
  }
});
