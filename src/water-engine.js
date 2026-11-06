import {
  poolBallUniforms,
} from "./pool-drop.js?v=signal-aa-1";
import { createLightGL } from "../vendor/webgl-water/lightgl.js?v=signal-aa-1";
import { createWaterClass } from "../vendor/webgl-water/water.js?v=signal-aa-1";
import { WATER_SURFACE, waterGrid } from "./water-surface.js?v=signal-aa-1";
import { createWaterCaustics } from "./water-caustics.js?v=signal-aa-1";
import { createPoolHallRenderer } from "./pool-hall-renderer.js?v=signal-aa-1";
import {
  waterSeedDrops,
  waterDrop,
  waterFrame,
} from "./water-timeline.js?v=signal-aa-1";

let imagesPromise;
export function loadWaterImages() {
  return (imagesPromise ??= Promise.all(
    ["tiles"].map(
      (name) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = () =>
            reject(
              new Error(
                "The pool textures could not load. Reload to try again.",
              ),
            );
          image.src = new URL(
            `../assets/water/${name}.jpg`,
            import.meta.url,
          ).href;
        }),
    ),
  )
    .then((entries) => Object.fromEntries(entries))
    .catch((error) => {
      imagesPromise = null;
      throw error;
    }));
}

/** Evan Wallace's original GPU heightfield and optical renderer, isolated per
 * canvas so the preview and film recorder never share a mutable GL context. */
export function createWaterEngine(canvas, images) {
  const GL = createLightGL();
  const gl = GL.create({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  const resources = [];
  const originals = [];
  for (const kind of [
    "Buffer",
    "Texture",
    "Shader",
    "Program",
    "Framebuffer",
    "Renderbuffer",
  ]) {
    const method = `create${kind}`,
      original = gl[method];
    originals.push([method, original]);
    gl[method] = function (...args) {
      const item = original.apply(gl, args);
      if (item) resources.push([kind, item]);
      return item;
    };
  }
  const cleanup = () => {
    for (let i = 0; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); i++)
      gl.disableVertexAttribArray(i);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    for (const [kind, item] of resources) gl[`delete${kind}`](item);
    for (const [method, original] of originals) gl[method] = original;
  };
  try {
    const Water = createWaterClass(GL, gl),
      grid = waterGrid();
    const water = new Water({
      width: grid.width,
      height: grid.height,
      worldSize: [WATER_SURFACE.width, WATER_SURFACE.length],
      heightScale: WATER_SURFACE.heightScale,
      coefficients: grid.coefficients,
    });
    if (!water.textureA.canDrawTo() || !water.textureB.canDrawTo())
      throw new Error(
        "This water scene needs floating-point graphics support. Try another browser, or select the bunny.",
      );
    const hall = createPoolHallRenderer(GL, gl);
    const caustics = createWaterCaustics(GL, gl);
    const copy = new GL.Shader(
      "varying vec2 uv; void main(){uv=gl_Vertex.xy*.5+.5;gl_Position=vec4(gl_Vertex.xyz,1.);}",
      "uniform sampler2D source;varying vec2 uv;void main(){gl_FragColor=texture2D(source,uv);}",
    );
    const checkpoints = new Map();
    let frame = 0,
      key = "",
      lastAnalysis;
    const copyTo = (texture) =>
      texture.drawTo(() => {
        water.textureA.bind();
        copy.uniforms({ source: 0 }).draw(water.plane);
      });
    function reset(settings) {
      for (const texture of [water.textureA, water.textureB])
        texture.drawTo(() => {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        });
      for (const drop of waterSeedDrops(settings))
        water.addDrop(drop.x, drop.y, drop.radius, drop.strength);
      for (let i = 0; i < 60; i++) water.stepSimulation();
      frame = 0;
    }
    function advance(analysis, time, settings, budget = 60) {
      const nextKey = [
        settings.seed,
        settings.impact,
        settings.resonance,
        settings.growth,
      ].join(",");
      if (nextKey !== key || analysis !== lastAnalysis) {
        for (const snapshot of checkpoints.values())
          gl.deleteTexture(snapshot.id);
        checkpoints.clear();
        key = nextKey;
        lastAnalysis = analysis;
        reset(settings);
      }
      const target = waterFrame(time);
      if (target < frame) {
        const nearest = Math.max(
          -1,
          ...[...checkpoints.keys()].filter((f) => f <= target),
        );
        if (nearest >= 0) {
          water.textureA.drawTo(() => {
            checkpoints.get(nearest).bind();
            copy.uniforms({ source: 0 }).draw(water.plane);
          });
          frame = nearest;
        } else reset(settings);
      }
      const end = Math.min(target, frame + budget);
      while (frame < end) {
        frame++;
        if (frame % 12 === 0) {
          const d = waterDrop(analysis, frame, settings);
          water.addDrop(d.x, d.y, d.radius, d.strength);
        }
        for (let substep = 0; substep < 2; substep++) {
          water.stepSimulation();
        }
        if (frame % 300 === 0 && !checkpoints.has(frame)) {
          const snapshot = new GL.Texture(
            water.textureA.width,
            water.textureA.height,
            {
              type: water.textureA.type,
              filter: gl.NEAREST,
            },
          );
          copyTo(snapshot);
          checkpoints.set(frame, snapshot);
          if (checkpoints.size > 16) {
            const oldest = checkpoints.keys().next().value;
            gl.deleteTexture(checkpoints.get(oldest).id);
            checkpoints.delete(oldest);
          }
        }
      }
      water.updateNormals();
      return frame >= target;
    }
    let disposed = false;
    return {
      async prepare(analysis, time, settings, signal) {
        while (!disposed) {
          if (signal?.aborted)
            throw new DOMException("Export cancelled.", "AbortError");
          gl.makeCurrent();
          gl.disable(gl.DEPTH_TEST);
          gl.disable(gl.BLEND);
          gl.disable(gl.CULL_FACE);
          if (advance(analysis, time, settings)) return;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      },
      render(analysis, time, settings) {
        gl.makeCurrent();
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        const settled = advance(analysis, time, settings);
        gl.clearColor(0, 0, 0, 1);
        const sphere = poolBallUniforms([], frame / 60);
        caustics.update(water, frame / 60, sphere);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        hall.render(
          water,
          caustics.texture,
          canvas,
          settings,
          frame / 60,
          sphere,
        );
        return settled;
      },
      dispose() {
        disposed = true;
        cleanup();
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
