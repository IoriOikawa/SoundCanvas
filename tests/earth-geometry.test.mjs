import test from "node:test";
import assert from "node:assert/strict";
import { buildColumnMesh, buildSphere } from "../src/earth-geometry.js";

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
