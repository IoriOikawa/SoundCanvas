import test from "node:test";
import assert from "node:assert/strict";
import * as surface from "../src/water-surface.js";
test("rectangular water uses nearly square world cells and stable, isotropic wave propagation", () => {
  const p = surface.waterGrid();
  assert.ok(Math.abs(p.cell[0] / p.cell[1] - 1) < 0.01);
  assert.ok(p.coefficients[0] > 0 && p.coefficients[1] > 0);
  assert.ok(p.coefficients[0] + p.coefficients[1] <= 1);
  assert.ok(
    Math.abs(
      p.coefficients[0] * p.cell[0] ** 2 - p.coefficients[1] * p.cell[1] ** 2,
    ) < 1e-12,
  );
  assert.ok(
    (p.width + 1) * (p.height + 1) < 65536,
    "caustic mesh fits WebGL1 indices",
  );
});
test("height and normal use the same world scale on both axes", () => {
  const n = surface.worldNormalFromUVGradient([0.74, 2.4]);
  const expected = 1.8 * 0.1;
  assert.ok(Math.abs(-n[0] / n[1] - expected) < 1e-9);
  assert.ok(Math.abs(-n[2] / n[1] - expected) < 1e-9);
});
test("fine waves have sub-millimetre height and normals match their height derivatives", () => {
  const x = 1.7,
    z = 8.2,
    time = 4.1,
    eps = 1e-5;
  const sample = surface.detailSurface(x, z, time);
  const dx =
    (surface.detailSurface(x + eps, z, time).height -
      surface.detailSurface(x - eps, z, time).height) /
    (2 * eps);
  const dz =
    (surface.detailSurface(x, z + eps, time).height -
      surface.detailSurface(x, z - eps, time).height) /
    (2 * eps);
  assert.ok(Math.abs(sample.height) < 0.0015);
  assert.ok(Math.abs(sample.gradient[0] - dx) < 1e-8);
  assert.ok(Math.abs(sample.gradient[1] - dz) < 1e-8);
  assert.deepEqual(sample, surface.detailSurface(x, z, time));
});
