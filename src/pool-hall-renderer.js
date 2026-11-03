import { poolHallCamera } from "./pool-hall.js?v=duck-toggle-1";
import { hallVertex, hallFragment } from "./pool-hall-shaders.js?v=duck-toggle-1";
export function createPoolHallRenderer(GL, gl) {
  const shader = new GL.Shader(
    hallVertex,
    hallFragment(!!gl.getExtension("OES_standard_derivatives")),
  );
  const plane = GL.Mesh.plane();
  return {
    render(water, caustics, canvas, settings, time, sphere) {
      water.textureA.bind(0);
      caustics.bind(1);
      shader
        .uniforms({
          waterTex: 0,
          waterTime: time,
          duckVisible: Number(settings.duckVisible !== false),
          ...sphere,
          causticTex: 1,
          resolution: [canvas.width, canvas.height],
          ...poolHallCamera(settings),
        })
        .draw(plane);
    },
  };
}
