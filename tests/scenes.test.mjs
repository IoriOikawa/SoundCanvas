import test from "node:test";
import assert from "node:assert/strict";
import { createSceneRenderer, sceneRendererClass } from "../src/scenes.js";
import { DEFAULT_SETTINGS } from "../src/model.js";
import { EarthRenderer } from "../src/earth-renderer.js?v=earth-1";

test("scene routing selects the Dancing Earth renderer", () => {
  assert.equal(sceneRendererClass("earth"), EarthRenderer);
});

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

test("Dancing Earth releases every graphics resource and listener", async () => {
  const { EarthRenderer } = await import("../src/earth-renderer.js");
  const buffers = [];
  const programs = [];
  const listeners = new Map();
  let nextAttribute = 0;
  const attributes = new Map();
  const gl = new Proxy(
    {
      ARRAY_BUFFER: 1,
      ELEMENT_ARRAY_BUFFER: 2,
      STATIC_DRAW: 3,
      DYNAMIC_DRAW: 4,
      FLOAT: 5,
      TRIANGLES: 6,
      TRIANGLE_STRIP: 7,
      UNSIGNED_SHORT: 8,
      VERTEX_SHADER: 9,
      FRAGMENT_SHADER: 10,
      COMPILE_STATUS: 11,
      LINK_STATUS: 12,
      DEPTH_TEST: 13,
      CULL_FACE: 14,
      BLEND: 15,
      COLOR_BUFFER_BIT: 16,
      DEPTH_BUFFER_BIT: 32,
      MAX_VERTEX_ATTRIBS: 16,
      createBuffer() {
        const buffer = { deleted: false };
        buffers.push(buffer);
        return buffer;
      },
      deleteBuffer(buffer) {
        buffer.deleted = true;
      },
      createProgram() {
        const program = { deleted: false };
        programs.push(program);
        return program;
      },
      deleteProgram(program) {
        program.deleted = true;
      },
      createShader() {
        return {};
      },
      getShaderParameter() {
        return true;
      },
      getProgramParameter() {
        return true;
      },
      getAttribLocation(_, name) {
        if (!attributes.has(name)) attributes.set(name, nextAttribute++);
        return attributes.get(name);
      },
      getUniformLocation(_, name) {
        return { name };
      },
      getParameter(parameter) {
        return parameter === 16 ? 16 : 0;
      },
    },
    {
      get(target, key) {
        return key in target ? target[key] : () => {};
      },
    },
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return gl;
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
  const renderer = new EarthRenderer(canvas);
  renderer.resize(960, 640);
  assert.doesNotThrow(() => renderer.render(null, 0, DEFAULT_SETTINGS));
  renderer.dispose();
  assert.ok(buffers.length > 0 && buffers.every(({ deleted }) => deleted));
  assert.ok(programs.length === 3 && programs.every(({ deleted }) => deleted));
  assert.equal(listeners.size, 0);
});
