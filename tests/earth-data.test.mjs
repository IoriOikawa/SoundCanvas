import test from "node:test";
import assert from "node:assert/strict";
import {
  pointInPolygon,
  sampleLand,
  packSamples,
} from "../scripts/prepare-earth.mjs";

const square = [[
  [-12, -10],
  [12, -10],
  [12, 10],
  [-12, 10],
  [-12, -10],
]];
const withHole = [
  square[0],
  [
    [-3, -3],
    [-3, 3],
    [3, 3],
    [3, -3],
    [-3, -3],
  ],
];
const fixture = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: square },
    },
  ],
};

test("polygon membership includes land and excludes holes", () => {
  assert.equal(pointInPolygon([0, 0], square), true);
  assert.equal(pointInPolygon([30, 0], square), false);
  assert.equal(pointInPolygon([0, 0], withHole), false);
  assert.equal(pointInPolygon([8, 0], withHole), true);
});

test("land sampling is stable, filled and row ordered", () => {
  const first = sampleLand(fixture, { latitudeStep: 5, surfaceStep: 5 });
  const second = sampleLand(fixture, { latitudeStep: 5, surfaceStep: 5 });
  assert.deepEqual(first, second);
  assert.ok(first.length > 8);
  assert.ok(first.every((point) => point.latitude >= -10 && point.latitude <= 10));
  assert.ok(first.every((point) => point.longitude >= -12 && point.longitude <= 12));
  assert.ok(first.every((point, index) => index === 0 || point.row >= first[index - 1].row));
});

test("packed samples are finite unit vectors with bounded metadata", () => {
  const packed = packSamples(
    sampleLand(fixture, { latitudeStep: 5, surfaceStep: 5 }),
  );
  assert.equal(packed.length % 6, 0);
  for (let index = 0; index < packed.length; index += 6) {
    assert.ok(
      Math.abs(Math.hypot(packed[index], packed[index + 1], packed[index + 2]) - 1) <
        1e-6,
    );
    assert.ok(packed.slice(index, index + 6).every(Number.isFinite));
    assert.ok(packed[index + 3] >= 0 && packed[index + 3] <= 1);
    assert.ok(packed[index + 4] >= 0 && packed[index + 4] <= 1);
    assert.ok(packed[index + 5] >= 0 && packed[index + 5] <= 1);
  }
});

test("east and west longitudes pack to the renderer's expected sides", () => {
  const [eastX, eastY, eastZ, , , , westX, westY, westZ] = packSamples([
    { longitude: 90, latitude: 0, row: 0, phase: 0, density: 0 },
    { longitude: -90, latitude: 0, row: 0, phase: 0, density: 0 },
  ]);
  assert.ok(Math.abs(eastX) < 1e-12);
  assert.equal(eastY, 0);
  assert.equal(Math.sign(eastZ), -1);
  assert.ok(Math.abs(westX) < 1e-12);
  assert.equal(westY, 0);
  assert.equal(Math.sign(westZ), 1);
});
