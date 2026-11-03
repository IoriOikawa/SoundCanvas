import test from "node:test";
import assert from "node:assert/strict";
import { poolHallCamera } from "../src/pool-hall.js";
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
test("pool camera remains inside the hall and above water at every saved view extreme", () => {
  for (const x of [-3, 0, 3])
    for (const y of [-3, 0, 3]) {
      const camera = poolHallCamera({ poolPanX: x, poolPanY: y });
      assert.ok(camera.eye[1] > 0.2 && camera.eye[1] < 2);
      assert.ok(Math.abs(camera.eye[0]) < 4.8);
      for (const v of [camera.forward, camera.right, camera.up])
        assert.ok(Math.abs(dot(v, v) - 1) < 1e-6);
      assert.ok(Math.abs(dot(camera.forward, camera.right)) < 1e-6);
      assert.ok(Math.abs(dot(camera.forward, camera.up)) < 1e-6);
      assert.ok(
        camera.forward[2] > 0.6,
        "always looks along the pool, not at its outer box",
      );
    }
});
test("saved pool view changes the view direction without moving the building", () => {
  const a = poolHallCamera({ poolPanX: 0, poolPanY: 0 });
  const b = poolHallCamera({ poolPanX: 1, poolPanY: 1 });
  assert.deepEqual(a.eye, b.eye);
  assert.notDeepEqual(a.forward, b.forward);
  assert.deepEqual(a, poolHallCamera({ poolPanX: 0, poolPanY: 0 }));
});

test("WASD moves relative to the view, diagonal speed stays constant and room bounds hold", async () => {
  const { movePoolCamera } = await import("../src/pool-hall.js");
  const start = { poolPanX: 0, poolPanY: 0, poolX: -0.45, poolZ: -1.35 };
  const w = movePoolCamera(start, new Set(["KeyW"]), 0.1);
  const s = movePoolCamera(start, new Set(["KeyS"]), 0.1);
  assert.ok(w.poolZ > start.poolZ);
  assert.ok(s.poolZ < start.poolZ);
  assert.ok(movePoolCamera(start, new Set(["KeyA"]), 0.1).poolX < start.poolX);
  assert.ok(movePoolCamera(start, new Set(["KeyD"]), 0.1).poolX > start.poolX);
  const diagonal = movePoolCamera(start, new Set(["KeyW", "KeyD"]), 0.1);
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.poolX - start.poolX, diagonal.poolZ - start.poolZ) -
        Math.hypot(w.poolX - start.poolX, w.poolZ - start.poolZ),
    ) < 1e-8,
  );
  let p = start;
  for (let i = 0; i < 1000; i++)
    p = movePoolCamera(p, new Set(["KeyW", "KeyD"]), 0.1);
  assert.ok(p.poolX <= 4.15 && p.poolZ <= 24.25);
  assert.equal(poolHallCamera(p).eye[1], 1.05);
  assert.deepEqual(
    movePoolCamera(start, new Set(["KeyW", "KeyS"]), 0.1),
    start,
  );
});

test("pool position survives settings files and old files get the default location", async () => {
  const { DEFAULT_SETTINGS, parseSettings, serializeSettings } =
    await import("../src/model.js");
  const saved = parseSettings(
    serializeSettings({ ...DEFAULT_SETTINGS, poolX: 2, poolZ: 9 }),
  );
  assert.deepEqual(poolHallCamera(saved).eye, [2, 1.05, 9]);
  assert.deepEqual(
    poolHallCamera(parseSettings('{"version":1,"settings":{"scene":"pool"}}'))
      .eye,
    [-0.45, 1.05, -1.35],
  );
  assert.throws(() => parseSettings('{"version":1,"settings":{"poolZ":99}}'));
});

test("diving respects the deck and keeps a submerged camera inside the basin", async () => {
  const { movePoolCamera } = await import("../src/pool-hall.js");
  const hold = (view, key) => {
    for (let i = 0; i < 40; i++) {
      view = movePoolCamera(view, new Set([key]), 0.1);
    }
    return view;
  };
  assert.ok(hold({}, "KeyQ").poolY > 0.12);
  const submerged = hold({ poolX: 0, poolZ: 1 }, "KeyQ");
  assert.equal(submerged.poolY, -0.9);
  assert.equal(hold(submerged, "KeyS").poolZ, 0.1);
  const surfaced = hold(submerged, "KeyE");
  assert.equal(surfaced.poolY, 1.05);
  assert.ok(hold(surfaced, "KeyS").poolZ < 0);
  assert.ok(poolHallCamera({ ...submerged, poolPanY: -30 }).forward[1] > 0.99);
});
