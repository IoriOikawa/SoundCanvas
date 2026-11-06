import { SignalRenderer } from "./signal-renderer.js?v=signal-aa-1";
import { RainRenderer } from "./rain-renderer.js?v=signal-aa-1";
import { SculptureRenderer } from "./renderer.js?v=signal-aa-1";
import { CausticsRenderer } from "./caustics-renderer.js?v=signal-aa-1";

export function createSceneRenderer(canvas, settings, options) {
  const scene = ["pool", "rain", "signal"].includes(settings.scene) ? settings.scene : "bunny";
  const Renderer = scene === "signal" ? SignalRenderer : scene === "rain" ? RainRenderer : scene === "pool" ? CausticsRenderer : SculptureRenderer;
  const renderer = new Renderer(canvas, options);
  renderer.scene = scene;
  return renderer;
}
