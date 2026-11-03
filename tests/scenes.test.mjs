import test from "node:test";
import assert from "node:assert/strict";
import { createSceneRenderer } from "../src/scenes.js";
import { DEFAULT_SETTINGS } from "../src/model.js";

test("successive bunny renderers never draw using deleted outgoing vertex buffers", () => {
  // Model the WebGL boundary's enabled-array lifetime, not its shader math.
  const enabled = new Set(),
    pointers = new Map();
  let array = null;
  const check = () => {
    for (const index of enabled)
      if (!pointers.get(index) || pointers.get(index).deleted)
        throw new Error("An enabled vertex array references a deleted buffer.");
  };
  const gl = new Proxy(
    {
      ARRAY_BUFFER: "array",
      MAX_VERTEX_ATTRIBS: "max",
      createBuffer() {
        return { deleted: false };
      },
      bindBuffer(target, buffer) {
        if (target === "array") array = buffer;
      },
      deleteBuffer(buffer) {
        buffer.deleted = true;
      },
      getAttribLocation(_, name) {
        return { position: 0, normal: 1, root: 2 }[name];
      },
      vertexAttribPointer(index) {
        pointers.set(index, array);
      },
      enableVertexAttribArray(index) {
        enabled.add(index);
      },
      disableVertexAttribArray(index) {
        enabled.delete(index);
      },
      getParameter() {
        return 8;
      },
      getShaderParameter() {
        return true;
      },
      getProgramParameter() {
        return true;
      },
      drawArrays: check,
      drawElements: check,
    },
    {
      get(target, key) {
        return key in target ? target[key] : () => ({});
      },
    },
  );
  const canvas = {
    width: 800,
    height: 450,
    getContext() {
      return gl;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  for (const scene of ["bunny", "bunny"]) {
    const settings = { ...DEFAULT_SETTINGS, scene };
    const renderer = createSceneRenderer(canvas, settings);
    assert.doesNotThrow(() => renderer.render(null, 5, settings), scene);
    renderer.dispose();
  }
});

test("a disposed pool never allocates graphics after late texture loading", async () => {
  const { CausticsRenderer } = await import("../src/caustics-renderer.js");
  let resolve,
    allocations = 0;
  const canvas = { addEventListener() {}, removeEventListener() {} };
  const renderer = new CausticsRenderer(canvas, {
    loadImages: () => new Promise((r) => (resolve = r)),
    createEngine: () => {
      allocations++;
    },
  });
  renderer.dispose();
  resolve({});
  await renderer.ready;
  assert.equal(allocations, 0);
});
test("pool initialization errors reach both the UI and awaited export", async () => {
  const { CausticsRenderer } = await import("../src/caustics-renderer.js");
  let reported;
  const renderer = new CausticsRenderer(
    { addEventListener() {}, removeEventListener() {} },
    {
      loadImages: async () => {
        throw new Error("texture unavailable");
      },
      onError: (e) => (reported = e),
    },
  );
  await assert.rejects(renderer.ready, /texture unavailable/);
  assert.equal(renderer.failed, true);
  assert.match(reported.message, /texture unavailable/);
  renderer.dispose();
});
