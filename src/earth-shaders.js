export const EARTH_BACKGROUND_VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main(){
  uv=position*.5+.5;
  gl_Position=vec4(position,0.,1.);
}`;

export const EARTH_BACKGROUND_FRAGMENT = `
precision mediump float;
varying vec2 uv;
void main(){
  float halo=exp(-length((uv-vec2(.5,.54))*vec2(1.,1.12))*3.4);
  float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  vec3 color=mix(vec3(.006,.014,.015),vec3(.028,.092,.094),halo);
  color+=(grain-.5)*.006;
  gl_FragColor=vec4(color,1.);
}`;

export const EARTH_OCEAN_VERTEX = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 projection;
uniform mat4 view;
uniform float scale;
varying vec3 objectNormal;
varying vec3 viewNormal;
const float axialTilt=.40840704;
vec3 tiltEarth(vec3 point){
  float cosine=cos(axialTilt);
  float sine=sin(axialTilt);
  return vec3(
    cosine*point.x-sine*point.y,
    sine*point.x+cosine*point.y,
    point.z
  );
}
void main(){
  objectNormal=normal;
  viewNormal=mat3(view)*tiltEarth(normal);
  gl_Position=projection*view*vec4(tiltEarth(position*scale),1.);
}`;

export const EARTH_OCEAN_FRAGMENT = `
precision mediump float;
varying vec3 objectNormal;
varying vec3 viewNormal;
uniform float rim;
float gridLine(float value,float count){
  float distanceFromCenter=abs(fract(value*count)-.5);
  return smoothstep(.468,.498,distanceFromCenter);
}
void main(){
  vec3 globe=normalize(objectNormal);
  vec3 view=normalize(viewNormal);
  float latitude=asin(clamp(globe.y,-1.,1.))/3.14159265+.5;
  float longitude=atan(globe.z,globe.x)/6.2831853+.5;
  float grid=max(gridLine(latitude,9.),gridLine(longitude,18.))*.15;
  float edge=pow(1.-abs(view.z),3.);
  vec3 color=vec3(.018,.052,.054);
  color+=vec3(.16,.32,.30)*grid;
  color+=vec3(.20,.46,.42)*edge*rim;
  gl_FragColor=vec4(color,1.);
}`;

export const EARTH_COLUMN_VERTEX = `
attribute vec3 root;
attribute vec3 tangent;
attribute vec3 bitangent;
attribute vec3 local;
attribute vec2 activity;
uniform mat4 projection;
uniform mat4 view;
uniform float scale;
varying float along;
varying float tip;
varying vec3 sideNormal;
const float axialTilt=.40840704;
vec3 tiltEarth(vec3 point){
  float cosine=cos(axialTilt);
  float sine=sin(axialTilt);
  return vec3(
    cosine*point.x-sine*point.y,
    sine*point.x+cosine*point.y,
    point.z
  );
}
void main(){
  along=local.z;
  tip=activity.y;
  vec3 position=root*(scale+.003+local.z*activity.x)+tangent*local.x+bitangent*local.y;
  vec3 side=normalize(tangent*local.x+bitangent*local.y);
  sideNormal=mat3(view)*tiltEarth(side);
  gl_Position=projection*view*vec4(tiltEarth(position),1.);
}`;

export const EARTH_COLUMN_FRAGMENT = `
precision mediump float;
varying float along;
varying float tip;
varying vec3 sideNormal;
void main(){
  vec3 cyan=mix(vec3(.34,.72,.66),vec3(.84,1.,.96),along);
  vec3 gold=vec3(.96,.82,.54);
  float warm=smoothstep(.62,1.,along)*tip;
  float light=.68+.32*abs(normalize(sideNormal).z);
  gl_FragColor=vec4(mix(cyan,gold,warm)*light,1.);
}`;
