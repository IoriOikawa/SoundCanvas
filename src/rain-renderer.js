import { rainViewScale } from "./rain-layout.js?v=signal-aa-1";
import { createProgram } from './gl.js?v=signal-aa-1';
import { RainSimulation, rainFlash } from './rain-simulation.js?v=signal-aa-1';
import { rainBackground } from './rain-background.js?v=signal-aa-1';
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D landscape;uniform sampler2D drops;uniform vec2 resolution;uniform vec2 viewScale;uniform float flash;uniform float night;
float heightAt(vec2 p){return texture2D(drops,p).r;}
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 scenery(vec2 p,float blur){
 vec3 c=texture2D(landscape,p).rgb*.24;
 c+=texture2D(landscape,p+vec2(blur,0.)).rgb*.19;
 c+=texture2D(landscape,p-vec2(blur,0.)).rgb*.19;
 c+=texture2D(landscape,p+vec2(0.,blur)).rgb*.19;
 c+=texture2D(landscape,p-vec2(0.,blur)).rgb*.19;return c;
}
void main(){
 vec2 p=(uv-.5)*viewScale+.5;
 if(p.x<0.||p.x>1.||p.y<0.||p.y>1.){
  float edge=max(max(-p.x,p.x-1.),max(-p.y,p.y-1.));
  gl_FragColor=vec4(vec3(.045,.052,.049)+.018*exp(-edge*18.),1.);return;
 }
 vec2 px=1./vec2(960.,640.);
 float h=heightAt(p);
 vec2 slope=vec2(heightAt(p+vec2(px.x,0.))-heightAt(p-vec2(px.x,0.)),heightAt(p+vec2(0.,px.y))-heightAt(p-vec2(0.,px.y)));
 vec3 col=scenery(clamp(p+slope*vec2(.12,.17),.001,.999),mix(.012,.001,smoothstep(.04,.4,h)));
 float wet=smoothstep(.015,.15,h);
 col=mix(col,col*.78,wet*.45);
 float rim=clamp(length(slope)*2.8,0.,1.);
 col+=vec3(.76,.83,.81)*max(0.,-slope.y+slope.x*.35)*.9;
 col-=max(0.,slope.y-slope.x*.35)*.32;
 col=mix(col,vec3(.76,.80,.77),.08*(1.-night)*(1.-wet));
 col+=flash*vec3(.48,.57,.65)*(1.+rim)*(.5+.5*exp(-length(p-vec2(.72,.1))*2.));
 // Distance to the inner edges of four separate glazed panes.
 float left=p.x<.5?.06:.519,right=p.x<.5?.481:.94;
 float top=p.y<.23?.025:.252,bottom=p.y<.23?.209:.895;
 float edge=min(min(p.x-left,right-p.x),min(p.y-top,bottom-p.y));
 col*=mix(.60,1.,smoothstep(0.,.025,edge));
 float grain=noise(floor(p*resolution));
 if(edge<0.){
  float depth=-edge;
  float bevel=exp(-depth*160.);
  float wood=noise(vec2(floor(p.x*500.),floor(p.y*34.)))*.012;
  col=vec3(.065,.073,.071)+wood;
  col+=vec3(.17,.18,.16)*bevel;
  col+=vec3(.06)*exp(-abs(depth-.012)*700.);
  col-=vec3(.038)*exp(-abs(depth-.024)*350.);
  col+=flash*vec3(.13,.16,.18)*bevel;
  if(p.y>.925)col+=vec3(.055)*exp(-abs(p.y-.94)*50.);
 }
 // A small brass latch at the base of the near window.
 vec2 handle=(p-vec2(.65,.941))*vec2(1.,1.5);
 if(abs(handle.x)<.062&&abs(handle.y)<.012){
  float shine=exp(-abs(handle.y+.004)*300.);
  col=vec3(.16,.14,.09)+vec3(.28,.24,.12)*shine+flash*.13;
  if(abs(handle.x)>.051)col*=.48;
 }
 float vignette=1.-.23*pow(length((p-.5)*vec2(1.2,.9)),1.2);
 col=col*vignette+(grain-.5)*.009;
 gl_FragColor=vec4(col,1.);
}`;
export class RainRenderer {
 constructor(canvas,{onError=()=>{}}={}){
  this.canvas=canvas;this.sim=new RainSimulation();this.disposed=false;
  const gl=this.gl=canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true});
  if(!gl)throw new Error('Rain Window needs WebGL support.');
  this.program=createProgram(gl,vertex,fragment);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.position=gl.getAttribLocation(this.program,'position');
  this.uniforms=Object.fromEntries(['landscape','drops','resolution','flash','night','viewScale'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  this.textures=[0,1].map(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
  this.map=document.createElement('canvas');this.map.width=960;this.map.height=640;this.ctx=this.map.getContext('2d');
  this.beads=[];let seed=783;
  for(let i=0;i<950;i++){const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};this.beads.push({x:random(),y:random(),r:.0006+random()*.0015});}
  this.lost=e=>{e.preventDefault();this.failed=true;onError(new Error('Graphics were interrupted. Reload to restore the rain window.'));};
  canvas.addEventListener('webglcontextlost',this.lost);this.ready=Promise.resolve();
 }
 resize(w,h){if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}}
 async prepare(analysis,time,settings,signal){
  do{
   if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
   if(this.sim.advance(analysis,time,settings,240))return;
   await new Promise(resolve=>setTimeout(resolve,0));
  }while(!this.disposed);
 }
 paint(){
  const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,960,640);
  for(const d of this.beads)this.drop(d,.5);
  // Moving drops wipe tiny beads from their wake before leaving a thin wet trace.
  for(const t of this.sim.trails){
   c.strokeStyle=`rgba(0,0,0,${t.life*.8})`;c.lineWidth=Math.max(1,t.r*6000);c.lineCap='round';
   c.beginPath();c.moveTo(t.x*960,t.y*640);c.lineTo(t.x*960,t.end*640+2);c.stroke();
  }
  for(const t of this.sim.trails){
   c.strokeStyle=`rgba(90,90,90,${t.life*.45})`;c.lineWidth=Math.max(.7,t.r*1400);c.lineCap='round';
   c.beginPath();c.moveTo(t.x*960,t.y*640);c.lineTo(t.x*960,t.end*640+2);c.stroke();
  }
  for(const d of this.sim.drops)this.drop(d,1);
 }
 drop(d,alpha){
  const c=this.ctx,x=d.x*960,y=d.y*640,r=d.r*960;
  c.save();c.translate(x,y);c.scale(1,1+(d.v||0)*4);
  const g=c.createRadialGradient(-r*.13,-r*.2,0,0,0,r);
  g.addColorStop(0,`rgba(230,230,230,${alpha})`);g.addColorStop(.48,`rgba(185,185,185,${alpha})`);g.addColorStop(.83,`rgba(100,100,100,${alpha})`);g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.restore();
 }
 render(analysis,time,settings){
  if(this.failed||this.disposed)return;
  this.settling=!this.sim.advance(analysis,time,settings);
  const gl=this.gl;gl.useProgram(this.program);gl.viewport(0,0,this.canvas.width,this.canvas.height);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);
  const kind=settings.rainBackground||'garden';
  if(this.background!==kind){this.background=kind;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,rainBackground(kind));}
  this.paint();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.map);
  gl.uniform2fv(this.uniforms.viewScale,rainViewScale(this.canvas.width,this.canvas.height));
  gl.uniform1i(this.uniforms.landscape,0);gl.uniform1i(this.uniforms.drops,1);gl.uniform2f(this.uniforms.resolution,this.canvas.width,this.canvas.height);
  gl.uniform1f(this.uniforms.flash,rainFlash(analysis,time,settings));gl.uniform1f(this.uniforms.night,kind==='night'?1:0);
  for(let i=0;i<gl.getParameter(gl.MAX_VERTEX_ATTRIBS);i++)gl.disableVertexAttribArray(i);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 dispose(){this.disposed=true;const g=this.gl;g.disableVertexAttribArray(this.position);g.deleteBuffer(this.buffer);g.deleteProgram(this.program);for(const t of this.textures)g.deleteTexture(t);this.canvas.removeEventListener('webglcontextlost',this.lost);}
}
