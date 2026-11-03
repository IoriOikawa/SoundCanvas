import { MAX_POOL_BALLS } from "./pool-drop.js?v=duck-toggle-1";
import { waterSurfaceGLSL } from "./water-surface.js?v=duck-toggle-1";
import { POOL_SUN } from "./pool-hall.js?v=duck-toggle-1";
export const hallVertex = `
varying vec2 uv;
void main(){uv=gl_Vertex.xy*.5+.5;gl_Position=vec4(gl_Vertex.xyz,1.);}
`;
export function hallFragment(derivatives) {
  return `${derivatives ? "#extension GL_OES_standard_derivatives : enable" : ""}
precision highp float;
varying vec2 uv;
uniform vec2 resolution;
uniform vec3 eye,forward,right,up;
// LightGL recognizes sampler uniforms declared individually.
uniform sampler2D waterTex;
uniform sampler2D causticTex;
uniform float duckVisible;
uniform vec4 ballSpheres[${MAX_POOL_BALLS}];
const vec3 sun=vec3(${POOL_SUN.map((n) => n.toFixed(8)).join(",")});
struct Hit {float t;vec3 n;float mat;};
${waterSurfaceGLSL}
bool inPool(vec3 p){return abs(p.x)<3.7&&p.z>0.&&p.z<24.;}
float windowMask(vec3 p){
 float z=abs(mod(p.z-1.,4.)-2.);
 return (1.-smoothstep(1.34,1.45,z))*smoothstep(.85,1.,p.y)*(1.-smoothstep(4.45,4.6,p.y));
}
float roofWindow(vec3 p){
 float z=abs(mod(p.z-1.,4.)-2.);
 return (1.-smoothstep(2.85,3.1,abs(p.x)))*(1.-smoothstep(1.25,1.4,z));
}
void plane(inout Hit h,vec3 o,vec3 d,vec3 n,float distance,float mat){
 float denom=dot(d,n);
 if(abs(denom)<.00001)return;
 float t=(distance-dot(o,n))/denom;
 if(t>.002&&t<h.t){h.t=t;h.n=denom<0.?n:-n;h.mat=mat;}
}
void box(inout Hit h,vec3 o,vec3 d,vec3 lo,vec3 hi,float mat){
 vec3 t0=(lo-o)/d,t1=(hi-o)/d;
 vec3 near=min(t0,t1),far=max(t0,t1);
 float a=max(max(near.x,near.y),near.z),b=min(min(far.x,far.y),far.z);
 if(a>.002&&a<b&&a<h.t){
  h.t=a;h.mat=mat;
  vec3 p=(o+d*a-(lo+hi)*.5)/((hi-lo)*.5);
  vec3 ap=abs(p);
  h.n=ap.x>ap.y&&ap.x>ap.z?vec3(sign(p.x),0.,0.):ap.y>ap.z?vec3(0.,sign(p.y),0.):vec3(0.,0.,sign(p.z));
 }
}
void sphereHit(inout Hit h,vec3 o,vec3 d,vec4 ballSphere){
 if(ballSphere.w<=0.)return;
 vec3 offset=o-ballSphere.xyz;
 float b=dot(offset,d),c=dot(offset,offset)-ballSphere.w*ballSphere.w;
 float discriminant=b*b-c;
 if(discriminant<0.)return;
 float root=sqrt(discriminant),t=-b-root;
 if(t<.002)t=-b+root;
 if(t>.002&&t<h.t){h.t=t;h.n=normalize(o+d*t-ballSphere.xyz);h.mat=4.;}
}
vec3 duckCenter;
mat3 duckBasis;
void placeDuck(){
 vec3 anchor=vec3(-.25,0.,4.5);
 float left=waterHeight(anchor-vec3(.25,0.,0.));
 float rightHeight=waterHeight(anchor+vec3(.25,0.,0.));
 float front=waterHeight(anchor-vec3(0.,0.,.19));
 float back=waterHeight(anchor+vec3(0.,0.,.19));
 duckCenter=anchor+vec3(0.,.075+(left+rightHeight+front+back)*.25,0.);
 vec3 across=normalize(vec3(1.,clamp((rightHeight-left)/.5,-.25,.25),0.));
 vec3 fore=vec3(0.,clamp((back-front)/.38,-.25,.25),1.);
 vec3 vertical=normalize(cross(fore,across));
 vec3 along=cross(across,vertical);
 // Turn the bill toward the pool-edge view, as in the reference.
 duckBasis=mat3(-.8*across+.6*along,vertical,-.6*across-.8*along);
}
void duckPart(inout Hit h,vec3 o,vec3 d,vec3 center,vec3 radii,float material){
 // Shear the bill into a single rounded wedge, higher where it meets the face.
 float shear=material==6.?.34:0.;
 vec3 offset=o-center, direction=d;
 offset.y-=shear*offset.x;
 direction.y-=shear*direction.x;
 offset/=radii;
 direction/=radii;
 float a=dot(direction,direction), b=dot(offset,direction);
 float discriminant=b*b-a*(dot(offset,offset)-1.);
 if(discriminant<0.)return;
 float root=sqrt(discriminant), t=(-b-root)/a;
 if(t<.002)t=(-b+root)/a;
 if(t>.002&&t<h.t){
  h.t=t;
  vec3 hit=offset+direction*t;
  vec3 normal=hit/radii;
  normal.x-=shear*normal.y;
  h.n=normalize(duckBasis*normal);
  h.mat=material;
  if(material==6.){
   // A curved, shallow mouth line follows the surface of the closed bill.
   float mouth=hit.y+.23-.28*hit.z*hit.z;
   float lower=1.-smoothstep(-.14,-.04,mouth);
   float crease=1.-smoothstep(.025,.10,abs(mouth));
   h.mat+=.75*max(lower*.45,crease);
  }
 }
}
void duckHit(inout Hit h,vec3 origin,vec3 ray){
 vec3 offset=origin-duckCenter;
 float closest=max(0.,-dot(offset,ray));
 if(length(offset+closest*ray)>.67)return;
 vec3 o=vec3(dot(offset,duckBasis[0]),dot(offset,duckBasis[1]),dot(offset,duckBasis[2]));
 vec3 d=vec3(dot(ray,duckBasis[0]),dot(ray,duckBasis[1]),dot(ray,duckBasis[2]));
 duckPart(h,o,d,vec3(.02,.012,0.),vec3(.36,.205,.255),5.);
 duckPart(h,o,d,vec3(.25,.072,0.),vec3(.165,.115,.156),5.);
 duckPart(h,o,d,vec3(.10,.048,-.175),vec3(.185,.108,.098),5.);
 duckPart(h,o,d,vec3(.10,.048,.175),vec3(.185,.108,.098),5.);
 duckPart(h,o,d,vec3(-.183,.281,0.),vec3(.189,.185,.178),5.);
 duckPart(h,o,d,vec3(-.373,.209,0.),vec3(.133,.066,.13),6.);
 duckPart(h,o,d,vec3(-.246,.282,-.163),vec3(.028,.031,.016),7.);
 duckPart(h,o,d,vec3(-.246,.282,.163),vec3(.028,.031,.016),7.);
 duckPart(h,o,d,vec3(-.251,.294,-.177),vec3(.008,.009,.004),8.);
 duckPart(h,o,d,vec3(-.251,.294,.177),vec3(.008,.009,.004),8.);
}
Hit architecture(vec3 o,vec3 d){
 Hit h;h.t=200.;h.n=vec3(0.,1.,0.);h.mat=3.;
 plane(h,o,d,vec3(0.,1.,0.),-1.05,0.);
 plane(h,o,d,vec3(1.,0.,0.),-4.9,0.);
 plane(h,o,d,vec3(1.,0.,0.),4.9,0.);
 plane(h,o,d,vec3(0.,0.,1.),25.,0.);
 plane(h,o,d,vec3(0.,0.,1.),-4.,0.);
 plane(h,o,d,vec3(0.,1.,0.),5.6,1.);
 // Raised walkways frame an inset pool; their submerged vertical faces form
 // the pool walls. The water ends at the coping, rather than a cutaway box.
 box(h,o,d,vec3(-4.9,-1.06,-4.),vec3(-3.7,.12,25.),0.);
 box(h,o,d,vec3(3.7,-1.06,-4.),vec3(4.9,.12,25.),0.);
 box(h,o,d,vec3(-3.7,-1.06,-4.),vec3(3.7,.12,0.),0.);
 box(h,o,d,vec3(-3.7,-1.06,24.),vec3(3.7,.12,25.),0.);
 for(int i=0;i<7;i++){
  float z=float(i)*4.+.8;
  box(h,o,d,vec3(-4.9,.12,z-.14),vec3(-4.45,5.6,z+.14),2.);
  box(h,o,d,vec3(4.45,.12,z-.14),vec3(4.9,5.6,z+.14),2.);
  box(h,o,d,vec3(-4.9,5.22,z-.18),vec3(4.9,5.6,z+.18),2.);
 }
 for(int i=0;i<${MAX_POOL_BALLS};i++) sphereHit(h,o,d,ballSpheres[i]);
 if(duckVisible>.5)duckHit(h,o,d);
 return h;
}
float daylight(vec3 p){
 float tx=(-4.9-p.x)/sun.x;
 float ty=(5.6-p.y)/sun.y;
 if(tx>0.&&tx<ty)return windowMask(p+sun*tx);
 vec3 roof=p+sun*ty;
 float beam=abs(mod(roof.z-.8+2.,4.)-2.);
 return roofWindow(roof)*smoothstep(.18,.3,beam);
}
vec3 tiles(vec2 p){
 vec2 q=p*3.1;
 vec2 cell=fract(q),edge=min(cell,1.-cell);
 vec2 aa=${derivatives ? "max(fwidth(q)*.7,vec2(.001))" : "vec2(.008)"};
 vec2 lines=1.-smoothstep(vec2(.014)-aa,vec2(.014)+aa,edge);
 float grout=max(lines.x,lines.y);
 float variation=sin(dot(floor(q),vec2(71.3,43.7)))*.008;
 return mix(vec3(.86,.89,.86)+variation,vec3(.59,.66,.63),grout*.8);
}
vec3 shade(Hit h,vec3 o,vec3 d){
 vec3 p=o+d*h.t,n=h.n;
 if(h.mat>3.5){
  float diffuse=max(0.,dot(n,sun));
  vec3 halfVector=normalize(sun-d);
  float specular=pow(max(0.,dot(n,halfVector)),100.);
  vec3 surfaceColor=vec3(.91,.90,.85);
  if(h.mat==5.)surfaceColor=vec3(.95,.64,.025);
  if(h.mat>=6.&&h.mat<7.)surfaceColor=mix(vec3(.98,.25,.028),vec3(.46,.077,.012),(h.mat-6.)/.75);
  if(h.mat==7.)surfaceColor=vec3(.018,.012,.008);
  if(h.mat==8.)return vec3(1.);
  return surfaceColor*(.38+1.05*diffuse)+vec3(1.6,1.5,1.3)*specular;
 }
 if(h.mat>2.5)return vec3(2.7,2.9,2.7);
 vec3 albedo;
 if(h.mat>1.5)albedo=vec3(.81,.85,.81);
 else if(h.mat>.5)albedo=vec3(.88,.89,.82);
 else {
  vec2 tileUV=abs(n.y)>.5?p.xz:abs(n.x)>.5?p.zy:p.xy;
  albedo=tiles(tileUV);
 }
 // The same windows illuminate both directly visible and reflected walls.
 if(abs(p.x)>4.89&&windowMask(p)>.01){
  float w=windowMask(p);
  float frame=(1.-smoothstep(.016,.045,abs(mod(p.y-.95,1.13)-.56)))*.55;
  vec3 outside=mix(vec3(.62,.92,.88),vec3(2.8,2.6,2.05),smoothstep(1.,4.6,p.y));
  return mix(albedo*.75,outside*(1.-frame),w);
 }
 if(p.y>5.59&&roofWindow(p)>.01)return mix(albedo,vec3(3.4,3.55,3.25),roofWindow(p));
 // A wide recess at the far end gives a quiet architectural focal point.
 if(p.z>24.99&&abs(p.x)<1.45&&p.y>.12&&p.y<3.7){
  float inset=smoothstep(0.,.16,min(1.45-abs(p.x),min(p.y-.12,3.7-p.y)));
  albedo=mix(albedo,vec3(.50,.66,.62),inset*.65);
 }
 float ambient=.30+.13*max(0.,n.y)+.07*(1.-abs(p.x)/4.9);
 float direct=daylight(p)*max(0.,dot(n,sun));
 vec3 color=albedo*(vec3(ambient)+vec3(2.6,2.15,1.35)*direct);
 if(p.y<-.015&&inPool(p)){
  vec3 submergedTint=vec3(.35,.73,.66);
  color*=submergedTint;
  // The projected texture measures irradiance on the horizontal floor.
  if(n.y>.5){
   float irradiance=texture2D(causticTex,waterUV(p)).r;
   float focus=clamp((irradiance-.2)*6.,-.65,2.4);
   vec3 sunlight=vec3(2.6,2.15,1.35)*direct;
   color=albedo*submergedTint*(vec3(ambient)+sunlight*(.62+focus*.85));
  }
 }
 // Gentle contact shading at edges; daylight remains the dominant treatment.
 float wallDistance=min(4.9-abs(p.x),25.-p.z);
 color*=.87+.13*smoothstep(0.,1.3,wallDistance);
 for(int i=0;i<${MAX_POOL_BALLS};i++){
  vec4 ballSphere=ballSpheres[i];
  if(ballSphere.w>0.){
   vec3 toward=ballSphere.xyz-p;
   float along=dot(toward,sun);
   float distance=length(toward-sun*along);
   float shadeAmount=(1.-smoothstep(ballSphere.w*.55,ballSphere.w*1.65,distance))*step(.01,along);
   color*=1.-shadeAmount*.38;
  }
 }
 float fog=1.-exp(-h.t*.002);
 return mix(color,vec3(.86,1.01,.96),fog);
}
vec3 filmic(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 throughWater(vec3 color,float distance){
 vec3 transmission=exp(-vec3(.34,.075,.045)*distance);
 return mix(vec3(.025,.25,.21),color,transmission);
}
void main(){
 vec2 screen=(uv*2.-1.)*vec2(resolution.x/resolution.y,1.);
 vec3 ray=normalize(forward+(right*screen.x+up*screen.y)*.51);
 if(duckVisible>.5)placeDuck();
 Hit h=architecture(eye,ray);
 vec3 color=shade(h,eye,ray);
 bool underwater=inPool(eye)&&eye.y<waterHeight(eye);
 float waterDistance=h.t;
 if((underwater&&ray.y>.0001)||(!underwater&&ray.y<-.0001)){
  float t=-eye.y/ray.y;
  vec3 p=eye+ray*t;
  for(int i=0;i<3;i++){
   t=(waterHeight(p)-eye.y)/ray.y;
   p=eye+ray*t;
  }
  if(inPool(p)&&t>0.&&t<h.t){
   vec3 normal=waterNormal(p)*(underwater?-1.:1.);
   vec3 reflected=reflect(ray,normal);
   vec3 transmitted=refract(ray,normal,underwater?1.333:1./1.333);
   vec3 reflectedOrigin=p+normal*.008;
   Hit reflection=architecture(reflectedOrigin,reflected);
   color=shade(reflection,reflectedOrigin,reflected);
   if(underwater) color=throughWater(color,reflection.t);
   // A zero refracted direction represents total internal reflection.
   if(dot(transmitted,transmitted)>.001){
    vec3 transmittedOrigin=p-normal*.008;
    Hit transmission=architecture(transmittedOrigin,transmitted);
    vec3 transmittedColor=shade(transmission,transmittedOrigin,transmitted);
    if(!underwater) transmittedColor=throughWater(transmittedColor,transmission.t);
    float fresnel=.0204+.9796*pow(1.-clamp(dot(-ray,normal),0.,1.),5.);
    color=mix(transmittedColor,color,fresnel);
   }
   if(!underwater){
    float glint=pow(max(0.,dot(reflected,sun)),900.);
    color+=vec3(3.5,3.1,2.3)*glint*daylight(p);
   }
   waterDistance=t;
  }
 }
 if(underwater) color=throughWater(color,waterDistance);
 color=pow(filmic(color*.95),vec3(1./2.2));
 gl_FragColor=vec4(color,1.);
}
`;
}
