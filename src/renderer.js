import { createProgram as program } from "./gl.js?v=duck-toggle-1";
import { buildSculpture } from "./model.js?v=duck-toggle-1";

import { BUNNY_POSITIONS } from "./bunny-data.js?v=duck-toggle-1";
import { getFurParameters } from "./fur.js?v=duck-toggle-1";
import {
  FUR_VERTEX as vertex,
  FUR_FRAGMENT as fragment,
} from "./fur-shaders.js?v=duck-toggle-1";

const backgroundVertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const backgroundFragment = `precision mediump float; varying vec2 uv;
void main(){
  float halo=exp(-length((uv-vec2(.5,.58))*vec2(1.,1.15))*3.5);
  float shadow=exp(-length((uv-vec2(.5,.15))*vec2(1.3,8.))*7.);
  float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  vec3 color=mix(vec3(.047,.071,.059),vec3(.16,.20,.15),halo);
  color-=shadow*.027;
  color+=(grain-.5)*.008;
  gl_FragColor=vec4(color,1.);
}`;

function perspective(aspect) {
  const f = 1 / Math.tan(0.64 / 2),
    near = 0.1,
    far = 50;
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
}

function lookAt(eye) {
  const normalize = (a) => {
    const length = Math.hypot(...a);
    return a.map((v) => v / length);
  };
  const z = normalize(eye);
  const x = normalize([z[2], 0, -z[0]]);
  const y = [z[1] * x[2], z[2] * x[0] - z[0] * x[2], -z[1] * x[0]];
  const dot = (a) => -(a[0] * eye[0] + a[1] * eye[1] + a[2] * eye[2]);
  return new Float32Array([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    dot(x),
    dot(y),
    dot(z),
    1,
  ]);
}

export class SculptureRenderer {
  constructor(canvas, { onError = () => {} } = {}) {
    this.canvas = canvas;
    this.onError = onError;
    this.gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    if (!this.gl)
      throw new Error(
        "3D graphics are unavailable. Enable graphics acceleration or try another browser.",
      );
    const gl = this.gl;
    this.program = program(gl, vertex, fragment);
    this.background = program(gl, backgroundVertex, backgroundFragment);
    this.positionBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.rootBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rootBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, BUNNY_POSITIONS, gl.STATIC_DRAW);
    this.indexBuffer = gl.createBuffer();
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    this.attributes = Object.fromEntries(
      ["position", "normal", "root"].map((key) => [
        key,
        gl.getAttribLocation(this.program, key),
      ]),
    );
    this.uniforms = Object.fromEntries(
      ["projection", "view", "eye", "fur", "shell", "musicTime"].map((key) => [
        key,
        gl.getUniformLocation(this.program, key),
      ]),
    );
    this.backgroundPosition = gl.getAttribLocation(this.background, "position");
    this.lost = (event) => {
      event.preventDefault();
      this.failed = true;
      onError(
        new Error(
          "The graphics connection was interrupted. Reload to continue.",
        ),
      );
    };
    canvas.addEventListener("webglcontextlost", this.lost);
    this.lastGeometryKey = "";
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(analysis, time, settings) {
    if (this.failed) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.background);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(this.backgroundPosition);
    gl.vertexAttribPointer(this.backgroundPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.program);
    const key = `${time.toFixed(3)}:${settings.impact}:${settings.resonance}:${settings.growth}:${settings.seed}`;
    if (this.lastAnalysis !== analysis || key !== this.lastGeometryKey) {
      const mesh = buildSculpture(analysis, time, settings);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW);
      if (!this.indexCount) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        this.indexCount = mesh.indices.length;
      }
      this.lastGeometryKey = key;
      this.lastAnalysis = analysis;
    }
    for (const [key, buffer] of [
      ["position", this.positionBuffer],
      ["normal", this.normalBuffer],
      ["root", this.rootBuffer],
    ]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(this.attributes[key]);
      gl.vertexAttribPointer(this.attributes[key], 3, gl.FLOAT, false, 0, 0);
    }
    const yaw = settings.yaw + time * 0.025;
    const pitch = settings.pitch;
    const distance = this.canvas.width / this.canvas.height < 1.1 ? 10.5 : 9.7;
    const eye = [
      Math.cos(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.sin(yaw) * Math.cos(pitch) * distance,
    ];
    gl.uniformMatrix4fv(
      this.uniforms.projection,
      false,
      perspective(this.canvas.width / this.canvas.height),
    );
    gl.uniformMatrix4fv(this.uniforms.view, false, lookAt(eye));
    gl.uniform3fv(this.uniforms.eye, eye);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    const coat = getFurParameters(analysis, time, settings);
    gl.uniform3f(this.uniforms.fur, coat.length, coat.sway, 0);
    gl.uniform1f(this.uniforms.musicTime, time);
    // Alpha-tested shells write depth, so accepted fibers do not need sorting.
    // Static root coordinates keep the strand pattern attached during deformation.
    for (let layer = 0; layer < coat.layers; layer++) {
      gl.uniform1f(
        this.uniforms.shell,
        coat.layers === 1 ? 0 : layer / (coat.layers - 1),
      );
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  dispose() {
    const gl = this.gl;
    // Attribute enables belong to the context, not to the linked program.
    // Release them before deleting buffers so another scene can reuse canvas.
    for (const location of new Set([
      ...Object.values(this.attributes),
      this.backgroundPosition,
    ]))
      gl.disableVertexAttribArray(location);
    for (const buffer of [
      this.positionBuffer,
      this.normalBuffer,
      this.rootBuffer,
      this.indexBuffer,
      this.quad,
    ])
      gl.deleteBuffer(buffer);
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.background);
    this.canvas.removeEventListener("webglcontextlost", this.lost);
  }
}
