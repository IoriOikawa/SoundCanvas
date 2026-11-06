import { createProgram } from "./gl.js?v=earth-1";
import { EARTH_SAMPLES } from "./earth-data.js?v=earth-1";
import { buildColumnMesh, buildSphere } from "./earth-geometry.js?v=earth-1";
import { earthFrame } from "./earth-motion.js?v=earth-1";
import {
  EARTH_BACKGROUND_VERTEX,
  EARTH_BACKGROUND_FRAGMENT,
  EARTH_OCEAN_VERTEX,
  EARTH_OCEAN_FRAGMENT,
  EARTH_COLUMN_VERTEX,
  EARTH_COLUMN_FRAGMENT,
} from "./earth-shaders.js?v=earth-1";

function perspective(aspect) {
  const field = 1 / Math.tan(0.64 / 2);
  const near = 0.1;
  const far = 20;
  return new Float32Array([
    field / aspect, 0, 0, 0,
    0, field, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

function lookAt(eye) {
  const normalize = (values) => {
    const length = Math.hypot(...values) || 1;
    return values.map((value) => value / length);
  };
  const z = normalize(eye);
  const x = normalize([z[2], 0, -z[0]]);
  const y = [
    z[1] * x[2],
    z[2] * x[0] - z[0] * x[2],
    -z[1] * x[0],
  ];
  const offset = (axis) =>
    -(axis[0] * eye[0] + axis[1] * eye[1] + axis[2] * eye[2]);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    offset(x), offset(y), offset(z), 1,
  ]);
}

export class EarthRenderer {
  constructor(canvas, { onError = () => {} } = {}) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    }));
    if (!gl)
      throw new Error(
        "Dancing Earth needs graphics acceleration. Try another browser or scene.",
      );

    this.backgroundProgram = createProgram(
      gl,
      EARTH_BACKGROUND_VERTEX,
      EARTH_BACKGROUND_FRAGMENT,
    );
    this.oceanProgram = createProgram(
      gl,
      EARTH_OCEAN_VERTEX,
      EARTH_OCEAN_FRAGMENT,
    );
    this.columnProgram = createProgram(
      gl,
      EARTH_COLUMN_VERTEX,
      EARTH_COLUMN_FRAGMENT,
    );

    this.quadBuffer = this.createBuffer(
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    );
    this.sphere = buildSphere();
    this.spherePositionBuffer = this.createBuffer(this.sphere.positions);
    this.sphereNormalBuffer = this.createBuffer(this.sphere.normals);
    this.sphereIndexBuffer = this.createBuffer(
      this.sphere.indices,
      gl.ELEMENT_ARRAY_BUFFER,
    );

    this.columns = buildColumnMesh(EARTH_SAMPLES);
    this.rootBuffer = this.createBuffer(this.columns.root);
    this.tangentBuffer = this.createBuffer(this.columns.tangent);
    this.bitangentBuffer = this.createBuffer(this.columns.bitangent);
    this.localBuffer = this.createBuffer(this.columns.local);
    this.activityBuffer = this.createBuffer(
      new Float32Array(this.columns.vertexCount * 2),
      gl.ARRAY_BUFFER,
      gl.DYNAMIC_DRAW,
    );
    this.columnIndexBuffer = this.createBuffer(
      this.columns.indices,
      gl.ELEMENT_ARRAY_BUFFER,
    );
    this.activity = new Float32Array(this.columns.vertexCount * 2);

    this.backgroundAttribute = gl.getAttribLocation(
      this.backgroundProgram,
      "position",
    );
    this.oceanAttributes = {
      position: gl.getAttribLocation(this.oceanProgram, "position"),
      normal: gl.getAttribLocation(this.oceanProgram, "normal"),
    };
    this.oceanUniforms = {
      projection: gl.getUniformLocation(this.oceanProgram, "projection"),
      view: gl.getUniformLocation(this.oceanProgram, "view"),
      scale: gl.getUniformLocation(this.oceanProgram, "scale"),
      rim: gl.getUniformLocation(this.oceanProgram, "rim"),
    };
    this.columnAttributes = Object.fromEntries(
      ["root", "tangent", "bitangent", "local", "activity"].map((name) => [
        name,
        gl.getAttribLocation(this.columnProgram, name),
      ]),
    );
    this.columnUniforms = {
      projection: gl.getUniformLocation(this.columnProgram, "projection"),
      view: gl.getUniformLocation(this.columnProgram, "view"),
      scale: gl.getUniformLocation(this.columnProgram, "scale"),
    };

    this.lost = (event) => {
      event.preventDefault();
      this.failed = true;
      onError(
        new Error(
          "The graphics connection was interrupted. Reload to restore Dancing Earth.",
        ),
      );
    };
    canvas.addEventListener("webglcontextlost", this.lost);
    this.ready = Promise.resolve();
  }

  createBuffer(data, target = this.gl.ARRAY_BUFFER, usage = this.gl.STATIC_DRAW) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(target, buffer);
    this.gl.bufferData(target, data, usage);
    return buffer;
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  bindAttribute(location, buffer, size) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  render(analysis, time, settings) {
    if (this.disposed || this.failed) return;
    const gl = this.gl;
    const width = Math.max(1, this.canvas.width);
    const height = Math.max(1, this.canvas.height);
    const aspect = width / height;
    const frame = earthFrame(analysis, time, settings);
    const projection = perspective(aspect);
    const yaw = settings.yaw + time * 0.018 + frame.low * 0.025;
    const pitch = settings.pitch - 0.16;
    const distance = aspect < 1.1 ? 3.55 : 3.25;
    const eye = [
      Math.cos(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      Math.sin(yaw) * Math.cos(pitch) * distance,
    ];
    const view = lookAt(eye);

    gl.viewport(0, 0, width, height);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0.003, 0.008, 0.009, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(this.backgroundProgram);
    this.bindAttribute(this.backgroundAttribute, this.quadBuffer, 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(this.oceanProgram);
    this.bindAttribute(
      this.oceanAttributes.position,
      this.spherePositionBuffer,
      3,
    );
    this.bindAttribute(this.oceanAttributes.normal, this.sphereNormalBuffer, 3);
    gl.uniformMatrix4fv(this.oceanUniforms.projection, false, projection);
    gl.uniformMatrix4fv(this.oceanUniforms.view, false, view);
    gl.uniform1f(this.oceanUniforms.scale, frame.scale);
    gl.uniform1f(this.oceanUniforms.rim, frame.rim);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.sphereIndexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      this.sphere.indices.length,
      gl.UNSIGNED_SHORT,
      0,
    );

    for (let vertex = 0; vertex < this.columns.vertexCount; vertex++) {
      const sample = this.columns.sampleIndex[vertex];
      this.activity[vertex * 2] = frame.heights[sample];
      this.activity[vertex * 2 + 1] = frame.tips[sample];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.activityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.activity, gl.DYNAMIC_DRAW);
    gl.useProgram(this.columnProgram);
    for (const [name, buffer, size] of [
      ["root", this.rootBuffer, 3],
      ["tangent", this.tangentBuffer, 3],
      ["bitangent", this.bitangentBuffer, 3],
      ["local", this.localBuffer, 3],
      ["activity", this.activityBuffer, 2],
    ])
      this.bindAttribute(this.columnAttributes[name], buffer, size);
    gl.uniformMatrix4fv(this.columnUniforms.projection, false, projection);
    gl.uniformMatrix4fv(this.columnUniforms.view, false, view);
    gl.uniform1f(this.columnUniforms.scale, frame.scale);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.columnIndexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      this.columns.indices.length,
      gl.UNSIGNED_SHORT,
      0,
    );
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    for (const location of new Set([
      this.backgroundAttribute,
      ...Object.values(this.oceanAttributes),
      ...Object.values(this.columnAttributes),
    ]))
      if (location >= 0) gl.disableVertexAttribArray(location);
    for (const buffer of [
      this.quadBuffer,
      this.spherePositionBuffer,
      this.sphereNormalBuffer,
      this.sphereIndexBuffer,
      this.rootBuffer,
      this.tangentBuffer,
      this.bitangentBuffer,
      this.localBuffer,
      this.activityBuffer,
      this.columnIndexBuffer,
    ])
      gl.deleteBuffer(buffer);
    gl.deleteProgram(this.backgroundProgram);
    gl.deleteProgram(this.oceanProgram);
    gl.deleteProgram(this.columnProgram);
    this.canvas.removeEventListener("webglcontextlost", this.lost);
  }
}
