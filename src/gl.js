export function createProgram(gl, vertex, fragment) {
  const result = gl.createProgram(),
    shaders = [];
  try {
    for (const [type, code] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(
          gl.getShaderInfoLog(shader) ||
            "The graphics shader could not be compiled.",
        );
      gl.attachShader(result, shader);
    }
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(result) ||
          "The graphics scene could not be prepared.",
      );
    return result;
  } catch (error) {
    gl.deleteProgram(result);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
}
