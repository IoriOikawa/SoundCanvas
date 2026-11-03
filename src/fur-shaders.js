export const FUR_VERTEX = `
attribute vec3 position;
attribute vec3 normal;
attribute vec3 root;
uniform mat4 projection;
uniform mat4 view;
uniform vec3 fur;
uniform float shell;
uniform float musicTime;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vRoot;
void main() {
  vec3 n=normalize(normal);
  float face=1.0-smoothstep(0.3,1.65,root.y)*0.35;
  vec3 breeze=vec3(sin(root.y*3.0+musicTime*2.4),0.15,cos(root.x*3.0+musicTime*1.7))*fur.y;
  vec3 groom=vec3(0.0,-0.22,0.0)+breeze;
  groom-=n*dot(groom,n);
  vec3 offset=n*fur.x*shell*face+groom*fur.x*shell*shell;
  vPosition=position+offset;
  vNormal=n;
  vRoot=root;
  gl_Position=projection*view*vec4(vPosition,1.0);
}`;

export const FUR_FRAGMENT = `
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vRoot;
uniform vec3 eye;
uniform vec3 fur;
uniform float shell;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main() {
  vec3 n=normalize(vNormal);
  vec3 v=normalize(eye-vPosition);
  if(dot(n,v)<0.0)n=-n;
  vec3 l=normalize(vec3(-3.0,6.0,4.0));
  vec3 l2=normalize(vec3(4.0,1.0,-3.0));
  float diffuse=max(dot(n,l),0.0);
  float other=max(dot(n,l2),0.0);
  float rim=pow(1.0-max(dot(n,v),0.0),3.0);
  float spec=pow(max(dot(n,normalize(l+v)),0.0),42.0);
  float soft=pow(max(dot(n,normalize(l+v)),0.0),5.0);
  vec3 color;
  if(fur.x==0.0){
    color=vec3(.66,.34,.17)*(.14+.8*diffuse+.23*other)
      +vec3(.95,.78,.54)*spec*.85+vec3(.27,.15,.08)*soft
      +vec3(.31,.39,.30)*rim*.38;
  }else{
    vec3 cell=floor(vRoot*95.0);
    float strand=hash(cell);
    if(shell>0.0){
      vec3 scatter=vec3(strand,hash(cell+17.0),hash(cell+49.0))-.5;
      vec3 delta=fract(vRoot*95.0)-.5-scatter*.7;
      delta-=n*dot(delta,n);
      if(shell>mix(.45,1.1,strand)||length(delta)>.4*(1.0-.72*shell))discard;
    }
    vec3 rootColor=vec3(.34,.26,.16);
    vec3 tipColor=vec3(.91,.83,.66);
    vec3 fiber=mix(rootColor,tipColor,sqrt(shell)*.86+strand*.1);
    color=fiber*(.3+.7*diffuse+.18*other)+tipColor*rim*shell*.22+tipColor*soft*.035;
  }
  gl_FragColor=vec4(pow(color,vec3(.85)),1.0);
}`;
