import test from "node:test";
import assert from "node:assert/strict";
import {
  EARTH_COLUMN_VERTEX,
  EARTH_OCEAN_VERTEX,
  EARTH_OCEAN_FRAGMENT,
} from "../src/earth-shaders.js";

test("ocean grid uses globe coordinates while rim light uses view coordinates", () => {
  assert.match(EARTH_OCEAN_VERTEX, /varying vec3 objectNormal/);
  assert.match(EARTH_OCEAN_VERTEX, /varying vec3 viewNormal/);
  assert.match(EARTH_OCEAN_FRAGMENT, /normalize\(objectNormal\)/);
  assert.match(EARTH_OCEAN_FRAGMENT, /normalize\(viewNormal\)/);
  assert.match(EARTH_OCEAN_FRAGMENT, /asin\(clamp\(globe\.y/);
  assert.match(EARTH_OCEAN_FRAGMENT, /pow\(1\.-abs\(view\.z\)/);
});

test("ocean and columns share the same axial tilt transform", () => {
  for (const shader of [EARTH_OCEAN_VERTEX, EARTH_COLUMN_VERTEX]) {
    assert.match(shader, /const float axialTilt=.40840704/);
    assert.match(shader, /vec3 tiltEarth\(vec3 point\)/);
    assert.match(shader, /cos\(axialTilt\)/);
    assert.match(shader, /sin\(axialTilt\)/);
  }
  assert.match(EARTH_OCEAN_VERTEX, /tiltEarth\(position\*scale\)/);
  assert.match(EARTH_OCEAN_VERTEX, /mat3\(view\)\*tiltEarth\(normal\)/);
  assert.match(EARTH_COLUMN_VERTEX, /tiltEarth\(position\)/);
  assert.match(EARTH_COLUMN_VERTEX, /tiltEarth\(side\)/);
});
