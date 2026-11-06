import { MAX_POOL_BALLS } from "./pool-drop.js?v=signal-aa-1";
// Pool-world adaptation of Evan Wallace's MIT differential-area caustics.
// Copyright 2011 Evan Wallace. Original notice: assets/WATER-NOTICE.md.
import {
  WATER_SURFACE,
  waterGrid,
  waterSurfaceGLSL,
} from "./water-surface.js?v=signal-aa-1";
import { POOL_SUN } from "./pool-hall.js?v=signal-aa-1";
export function createWaterCaustics(GL, gl) {
  const derivatives = !!gl.getExtension("OES_standard_derivatives");
  const grid = waterGrid();
  const mesh = GL.Mesh.plane({ detailX: grid.width, detailY: grid.height });
  const texture = new GL.Texture(512, 1024);
  const shader = new GL.Shader(
    `
 uniform sampler2D waterTex;
 uniform vec3 sun;
 varying vec3 oldPosition,newPosition;
 ${waterSurfaceGLSL}
 void main(){
  vec2 uv=gl_Vertex.xy*.5+.5;
  vec3 basePoint=vec3((uv.x-.5)*waterExtent.x,0.,uv.y*waterExtent.y);
  vec3 displaced=vec3(basePoint.x,waterHeight(basePoint),basePoint.z);
  vec3 normal=waterNormal(basePoint);
  vec3 flatRay=refract(-sun,vec3(0.,1.,0.),1./1.333);
  vec3 bentRay=refract(-sun,normal,1./1.333);
  oldPosition=basePoint+flatRay*((${WATER_SURFACE.floor}-basePoint.y)/flatRay.y);
  newPosition=displaced+bentRay*((${WATER_SURFACE.floor}-displaced.y)/bentRay.y);
  vec2 projected=newPosition.xz/waterExtent+vec2(.5,0.);
  gl_Position=vec4(projected*2.-1.,0.,1.);
 }`,
    `${derivatives ? "#extension GL_OES_standard_derivatives : enable\n" : ""}
 uniform vec4 ballSpheres[${MAX_POOL_BALLS}];
 uniform vec3 sun;
 varying vec3 oldPosition,newPosition;
 void main(){
  ${
    derivatives
      ? `float oldArea=length(cross(dFdx(oldPosition),dFdy(oldPosition)));
  float newArea=length(cross(dFdx(newPosition),dFdy(newPosition)));
  float intensity=clamp(oldArea/max(newArea,.000001)*.2,0.,4.);`
      : "float intensity=.2;"
  }
  for(int i=0;i<${MAX_POOL_BALLS};i++){
   vec4 ballSphere=ballSpheres[i];
   if(ballSphere.w>0.){
    vec3 toward=normalize(-refract(-sun,vec3(0.,1.,0.),1./1.333));
    vec3 offset=ballSphere.xyz-newPosition;
    float along=dot(offset,toward);
    float distance=length(offset-toward*along);
    intensity*=1.-(1.-smoothstep(ballSphere.w*.65,ballSphere.w*1.3,distance))*step(0.,along)*.6;
   }
  }
  gl_FragColor=vec4(intensity,1.,0.,1.);
 }`,
  );
  return {
    texture,
    update(water, time, sphere) {
      texture.drawTo(() => {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        water.textureA.bind(0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        shader
          .uniforms({
            waterTex: 0,
            sun: POOL_SUN,
            waterTime: time,
            ...sphere,
          })
          .draw(mesh);
        gl.disable(gl.BLEND);
      });
    },
  };
}
