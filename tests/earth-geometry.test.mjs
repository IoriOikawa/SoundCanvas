import test from "node:test";
import assert from "node:assert/strict";
import { buildColumnMesh, buildSphere } from "../src/earth-geometry.js";
import { earthCameraDistance } from "../src/earth-renderer.js";

const samples = new Float32Array([
  1, 0, 0, 0.2, 0.1, 0.3,
  0, 1, 0, 0.8, 0.6, 0.7,
]);

test("each sample becomes one indexed hexagonal column", () => {
  const mesh = buildColumnMesh(samples);
  assert.equal(mesh.vertexCount, 24);
  assert.equal(mesh.indices.length, 2 * 60);
  assert.equal(mesh.sampleIndex.length, mesh.vertexCount);
  assert.ok(mesh.indices.every((index) => index < mesh.vertexCount));
  for (const array of [mesh.root, mesh.tangent, mesh.bitangent, mesh.local])
    assert.ok(array.every(Number.isFinite));
});

test("sphere mesh is finite, outward and under WebGL 1 index limits", () => {
  const mesh = buildSphere(48, 32);
  assert.ok(mesh.vertexCount < 65536);
  assert.ok(mesh.indices.every((index) => index < mesh.vertexCount));
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.deepEqual(mesh.positions, mesh.normals);
});

test("Earth keeps equal bounded proportions on wide and portrait stages", () => {
  const field = 1 / Math.tan(0.64 / 2);
  const radius = 1.06;
  for (const [width, height] of [
    [960, 640],
    [2000, 510],
    [1280, 720],
    [390, 600],
  ]) {
    const aspect = width / height;
    const distance = earthCameraDistance(aspect);
    const vertical = field / Math.sqrt(distance ** 2 - radius ** 2) * radius;
    const horizontal = vertical / aspect;
    const largest = Math.max(vertical, horizontal);
    assert.ok(largest >= 0.68 && largest <= 0.72, `${width}×${height}: ${largest}`);
  }
});
