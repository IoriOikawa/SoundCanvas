import { SignalRenderer } from "./signal-renderer.js?v=signal-aa-1";
import { RainRenderer } from "./rain-renderer.js?v=signal-aa-1";
import { SculptureRenderer } from "./renderer.js?v=signal-aa-1";
import { CausticsRenderer } from "./caustics-renderer.js?v=signal-aa-1";
import { EarthRenderer } from "./earth-renderer.js?v=earth-1";

export function sceneRendererClass(scene) {
  if (scene === "earth") return EarthRenderer;
  if (scene === "signal") return SignalRenderer;
  if (scene === "rain") return RainRenderer;
  if (scene === "pool") return CausticsRenderer;
  return SculptureRenderer;
}

export function createSceneRenderer(canvas, settings, options) {
  const scene = ["pool", "rain", "signal", "earth"].includes(settings.scene)
    ? settings.scene
    : "bunny";
  const renderer = new (sceneRendererClass(scene))(canvas, options);
  renderer.scene = scene;
  return renderer;
}
