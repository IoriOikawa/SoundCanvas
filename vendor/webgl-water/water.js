export function createWaterClass(GL, gl) {
/*
 * WebGL Water
 * http://madebyevan.com/webgl-water/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */

// The data in the texture is (position.y, velocity.y, normal.x, normal.z)
function Water(options) {
  options = options || {};
  var width = options.width || 256, height = options.height || 256;
  this.worldSize = options.worldSize || [1, 1];
  this.heightScale = options.heightScale || 1;
  this.coefficients = options.coefficients || [0.5, 0.5];
  var vertexShader = '\
    varying vec2 coord;\
    void main() {\
      coord = gl_Vertex.xy * 0.5 + 0.5;\
      gl_Position = vec4(gl_Vertex.xyz, 1.0);\
    }\
  ';
  this.plane = GL.Mesh.plane();
  if (!GL.Texture.canUseFloatingPointTextures()) {
    throw new Error('This demo requires the OES_texture_float extension');
  }
  var filter = GL.Texture.canUseFloatingPointLinearFiltering() ? gl.LINEAR : gl.NEAREST;
  this.textureA = new GL.Texture(width, height, { type: gl.FLOAT, filter: filter });
  this.textureB = new GL.Texture(width, height, { type: gl.FLOAT, filter: filter });
  if ((!this.textureA.canDrawTo() || !this.textureB.canDrawTo()) && GL.Texture.canUseHalfFloatingPointTextures()) {
    filter = GL.Texture.canUseHalfFloatingPointLinearFiltering() ? gl.LINEAR : gl.NEAREST;
    this.textureA = new GL.Texture(width, height, { type: gl.HALF_FLOAT_OES, filter: filter });
    this.textureB = new GL.Texture(width, height, { type: gl.HALF_FLOAT_OES, filter: filter });
  }
  this.dropShader = new GL.Shader(vertexShader, '\
    const float PI = 3.141592653589793;\
    uniform sampler2D texture;\
    uniform vec2 center;\
    uniform vec2 worldSize;\
    uniform float radius;\
    uniform float strength;\
    varying vec2 coord;\
    void main() {\
      /* get vertex info */\
      vec4 info = texture2D(texture, coord);\
      \
      /* add the drop to the height */\
      float drop = max(0.0, 1.0 - length((center * 0.5 + 0.5 - coord) * worldSize) / radius);\
      drop = 0.5 - cos(drop * PI) * 0.5;\
      info.r += drop * strength;\
      \
      gl_FragColor = info;\
    }\
  ');
  this.updateShader = new GL.Shader(vertexShader, '\
    uniform sampler2D texture;\
    uniform vec2 delta;\
    uniform vec2 coefficients;\
    uniform vec2 cell;\
    uniform float heightScale;\
    varying vec2 coord;\
    void main() {\
      /* get vertex info */\
      vec4 info = texture2D(texture, coord);\
      \
      /* calculate average neighbor height */\
      vec2 dx = vec2(delta.x, 0.0);\
      vec2 dy = vec2(0.0, delta.y);\
      vec2 laplacian = vec2(\
        texture2D(texture, coord - dx).r + texture2D(texture, coord + dx).r - 2.0 * info.r,\
        texture2D(texture, coord - dy).r + texture2D(texture, coord + dy).r - 2.0 * info.r);\
      info.g += dot(laplacian, coefficients);\
      \
      /* attenuate the velocity a little so waves do not last forever */\
      info.g *= 0.995;\
      \
      /* move the vertex along the velocity */\
      info.r += info.g;\
      \
      gl_FragColor = info;\
    }\
  ');
  this.normalShader = new GL.Shader(vertexShader, '\
    uniform sampler2D texture;\
    uniform vec2 delta;\
    uniform vec2 coefficients;\
    uniform vec2 cell;\
    uniform float heightScale;\
    varying vec2 coord;\
    void main() {\
      /* get vertex info */\
      vec4 info = texture2D(texture, coord);\
      \
      /* update the normal */\
      vec3 dx = vec3(cell.x, (texture2D(texture, vec2(coord.x + delta.x, coord.y)).r - info.r) * heightScale, 0.0);\
      vec3 dy = vec3(0.0, (texture2D(texture, vec2(coord.x, coord.y + delta.y)).r - info.r) * heightScale, cell.y);\
      info.ba = normalize(cross(dy, dx)).xz;\
      \
      gl_FragColor = info;\
    }\
  ');
  this.sphereShader = new GL.Shader(vertexShader, '\
    uniform sampler2D texture;\
    uniform vec3 oldCenter, newCenter;\
    uniform vec2 worldSize;\
    uniform float radius, heightScale;\
    varying vec2 coord;\
    float submergedColumn(vec3 center) {\
      vec2 point=vec2((coord.x-.5)*worldSize.x,coord.y*worldSize.y);\
      float d2=dot(point-center.xz,point-center.xz);\
      if(d2>=radius*radius)return 0.;\
      float halfHeight=sqrt(radius*radius-d2);\
      return max(0.,min(0.,center.y+halfHeight)-max(-1.05,center.y-halfHeight));\
    }\
    void main(){\
      vec4 info=texture2D(texture,coord);\
      info.r+=(submergedColumn(oldCenter)-submergedColumn(newCenter))*.12/heightScale;\
      gl_FragColor=info;\
    }\
  ');
}

Water.prototype.addDrop = function(x, y, radius, strength) {
  var this_ = this;
  this.textureB.drawTo(function() {
    this_.textureA.bind();
    this_.dropShader.uniforms({
      center: [x, y],
      radius: radius * this_.worldSize[0],
      worldSize: this_.worldSize,
      strength: strength
    }).draw(this_.plane);
  });
  this.textureB.swapWith(this.textureA);
};

Water.prototype.moveSphere = function(oldCenter, newCenter, radius) {
  var this_ = this;
  this.textureB.drawTo(function() {
    this_.textureA.bind();
    this_.sphereShader.uniforms({
      oldCenter: oldCenter,
      newCenter: newCenter,
      worldSize: this_.worldSize,
      heightScale: this_.heightScale,
      radius: radius
    }).draw(this_.plane);
  });
  this.textureB.swapWith(this.textureA);
};

Water.prototype.stepSimulation = function() {
  var this_ = this;
  this.textureB.drawTo(function() {
    this_.textureA.bind();
    this_.updateShader.uniforms({
      delta: [1 / this_.textureA.width, 1 / this_.textureA.height],
      coefficients: this_.coefficients,
      cell: [this_.worldSize[0] / this_.textureA.width, this_.worldSize[1] / this_.textureA.height],
      heightScale: this_.heightScale
    }).draw(this_.plane);
  });
  this.textureB.swapWith(this.textureA);
};

Water.prototype.updateNormals = function() {
  var this_ = this;
  this.textureB.drawTo(function() {
    this_.textureA.bind();
    this_.normalShader.uniforms({
      delta: [1 / this_.textureA.width, 1 / this_.textureA.height],
      coefficients: this_.coefficients,
      cell: [this_.worldSize[0] / this_.textureA.width, this_.worldSize[1] / this_.textureA.height],
      heightScale: this_.heightScale
    }).draw(this_.plane);
  });
  this.textureB.swapWith(this.textureA);
};

return Water;
}
