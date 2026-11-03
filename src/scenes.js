import { SculptureRenderer } from "./renderer.js?v=duck-toggle-1";
import { CausticsRenderer } from "./caustics-renderer.js?v=duck-toggle-1";

export function createSceneRenderer(canvas, settings, options) {
  const scene = settings.scene === "pool" ? "pool" : "bunny";
  const Renderer = scene === "pool" ? CausticsRenderer : SculptureRenderer;
  const renderer = new Renderer(canvas, options);
  renderer.scene = scene;
  return renderer;
}
