import test from "node:test";
import assert from "node:assert/strict";
import {
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
