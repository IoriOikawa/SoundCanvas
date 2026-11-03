/** World units shared by simulation, surface intersection and optical normals. */
export const WATER_SURFACE = Object.freeze({
  width: 7.4,
  length: 24,
  heightScale: 1.8,
  floor: -1.05,
  columns: 128,
  rows: 416,
  speed: 1.65,
  step: 1 / 120,
});
export function waterGrid() {
  const p = WATER_SURFACE,
    cell = [p.width / p.columns, p.length / p.rows];
  return {
    width: p.columns,
    height: p.rows,
    cell,
    coefficients: cell.map((d) => ((p.speed * p.step) / d) ** 2),
  };
}
export function worldNormalFromUVGradient(gradient) {
  const p = WATER_SURFACE,
    n = [
      (-gradient[0] * p.heightScale) / p.width,
      1,
      (-gradient[1] * p.heightScale) / p.length,
    ];
  const length = Math.hypot(...n);
  return n.map((v) => v / length);
}
const waves = [
  { direction: [0.8, 0.6], length: 0.19, amplitude: 0.00035, phase: 0.2 },
  { direction: [-0.6, 0.8], length: 0.31, amplitude: 0.00045, phase: 1.7 },
  { direction: [0.28, -0.96], length: 0.13, amplitude: 0.00022, phase: 3.8 },
].map((w) => ({
  ...w,
  k: (2 * Math.PI) / w.length,
  omega: Math.sqrt((9.81 * 2 * Math.PI) / w.length),
}));
export function detailSurface(x, z, time) {
  let height = 0;
  const gradient = [0, 0];
  for (const w of waves) {
    const phase =
      (x * w.direction[0] + z * w.direction[1]) * w.k -
      time * w.omega +
      w.phase;
    height += w.amplitude * Math.sin(phase);
    for (let i = 0; i < 2; i++)
      gradient[i] += w.amplitude * w.k * w.direction[i] * Math.cos(phase);
  }
  return { height, gradient };
}
const number = (n) => Number(n).toFixed(10);
// Generated from the same wave definitions as the finite-difference checks.
export const waterSurfaceGLSL = `
uniform float waterTime;
const vec2 waterExtent=vec2(${number(WATER_SURFACE.width)},${number(WATER_SURFACE.length)});
const float waterHeightScale=${number(WATER_SURFACE.heightScale)};
vec2 waterUV(vec3 p){return p.xz/waterExtent+vec2(.5,0.);}
vec3 smallWaves(vec2 p){
 vec3 result=vec3(0.);
 ${waves
   .map(
     (w) => `{
 vec2 direction=vec2(${w.direction.map(number).join(",")});
 float phase=dot(p,direction)*${number(w.k)}-waterTime*${number(w.omega)}+${number(w.phase)};
 result.x+=${number(w.amplitude)}*sin(phase);
 result.yz+=${number(w.amplitude * w.k)}*direction*cos(phase);
 }`,
   )
   .join("\n")}
 return result;
}
float waterHeight(vec3 p){return texture2D(waterTex,clamp(waterUV(p),0.,1.)).r*waterHeightScale+smallWaves(p.xz).x;}
vec3 waterNormal(vec3 p){
 vec2 encoded=texture2D(waterTex,clamp(waterUV(p),0.,1.)).ba;
 float ny=sqrt(max(.0001,1.-dot(encoded,encoded)));
 vec2 gradient=-encoded/ny+smallWaves(p.xz).yz;
 return normalize(vec3(-gradient.x,1.,-gradient.y));
}
`;
