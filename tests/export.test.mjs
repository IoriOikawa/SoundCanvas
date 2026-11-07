import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { recordFilm } from "../src/export.js";
import { DEFAULT_SETTINGS } from "../src/model.js";

for (const scene of ["pool", "bunny", "earth"])
  test(`${scene} recorder startup rejection releases cancellation listeners and restores transport`, async () => {
    const globals = [
      "HTMLCanvasElement",
      "document",
      "MediaRecorder",
      "cancelAnimationFrame",
    ];
    const original = new Map(
      globals.map((key) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );
    const visibilityListeners = new Set();
    // Browser graphics/recording boundaries are unavailable in Node. The stub
    // deliberately fails at recorder.start, after all cancellation hooks exist.
    const gl = new Proxy(
      {},
      {
        get(_, key) {
          if (key === "getShaderParameter" || key === "getProgramParameter")
            return () => true;
          if (key === "getAttribLocation") return () => 0;
          return () => ({});
        },
      },
    );
    class Canvas {
      width = 0;
      height = 0;
      getContext() {
        return gl;
      }
      addEventListener() {}
      removeEventListener() {}
      captureStream() {
        return {
          addTrack() {},
          getTracks() {
            return [];
          },
        };
      }
    }
    const signal = new AbortController().signal;
    const source = { connect() {}, disconnect() {}, stop() {} };
    const context = {
      currentTime: 0,
      createMediaStreamDestination() {
        return {
          stream: {
            getAudioTracks() {
              return [];
            },
          },
          disconnect() {},
        };
      },
      createBufferSource() {
        return source;
      },
    };
    let restored = false;
    const transport = {
      time: 4,
      duration: 20,
      buffer: {},
      playing: false,
      ready: async () => context,
      pause() {},
      seek: async (time) => {
        restored = time === 4;
      },
    };
    try {
      globalThis.HTMLCanvasElement = Canvas;
      globalThis.document = {
        createElement() {
          return new Canvas();
        },
        addEventListener(_, callback) {
          visibilityListeners.add(callback);
        },
        removeEventListener(_, callback) {
          visibilityListeners.delete(callback);
        },
      };
      globalThis.MediaRecorder = class {
        static isTypeSupported() {
          return true;
        }
        state = "inactive";
        start() {
          throw new Error("start rejected");
        }
      };
      globalThis.cancelAnimationFrame = () => {};
      await assert.rejects(
        recordFilm({
          transport,
          analysis: null,
          settings: { ...DEFAULT_SETTINGS, scene },
          seconds: 15,
          signal,
          createRenderer:
            scene === "pool"
              ? () => ({
                  ready: Promise.resolve(),
                  resize() {},
                  render() {},
                  dispose() {},
                })
              : undefined,
        }),
        /start rejected/,
      );
      assert.equal(visibilityListeners.size, 0);
      assert.equal(getEventListeners(signal, "abort").length, 0);
      assert.equal(restored, true);
    } finally {
      for (const [key, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });

test("cancelling while pool textures are pending restores playback immediately", async () => {
  const keys = [
    "HTMLCanvasElement",
    "document",
    "MediaRecorder",
    "cancelAnimationFrame",
  ];
  const original = new Map(
    keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const controller = new AbortController();
  let restored = false,
    disposed = false;
  const transport = {
    time: 8,
    duration: 60,
    playing: false,
    ready: async () => ({}),
    pause() {},
    seek: async (t) => {
      restored = t === 8;
    },
  };
  try {
    globalThis.HTMLCanvasElement = class {
      captureStream() {}
    };
    globalThis.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
    };
    globalThis.document = { createElement: () => ({}) };
    globalThis.cancelAnimationFrame = () => {};
    const promise = recordFilm({
      transport,
      analysis: null,
      settings: DEFAULT_SETTINGS,
      seconds: 15,
      signal: controller.signal,
      createRenderer: () => ({
        ready: new Promise(() => {}),
        dispose() {
          disposed = true;
        },
      }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();
    await assert.rejects(
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Cancellation waited for textures")),
            100,
          ),
        ),
      ]),
      { name: "AbortError" },
    );
    assert.equal(restored, true);
    assert.equal(disposed, true);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  } finally {
    for (const [key, d] of original) {
      if (d) Object.defineProperty(globalThis, key, d);
      else delete globalThis[key];
    }
  }
});
