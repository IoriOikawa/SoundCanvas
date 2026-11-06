import { createProgram } from './gl.js?v=signal-aa-1';
import { signalRows, SIGNAL_SAMPLES } from './signal-lines.js?v=signal-aa-1';
const vertex=`attribute vec3 position;varying float edge;void main(){edge=position.z;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment=`precision mediump float;uniform vec4 ink;uniform float stroke;uniform float halfWidth;varying float edge;void main(){float coverage=mix(1.,clamp(halfWidth+.5-abs(edge),0.,1.),stroke);gl_FragColor=vec4(ink.rgb,ink.a*coverage);}`;
export class SignalRenderer {
 constructor(canvas,{onError=()=>{}}={}){
  this.canvas=canvas;
  const gl=this.gl=canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true});
  if(!gl)throw new Error('Signal Lines needs WebGL support.');
  this.program=createProgram(gl,vertex,fragment);this.buffer=gl.createBuffer();
  this.position=gl.getAttribLocation(this.program,'position');this.ink=gl.getUniformLocation(this.program,'ink');this.stroke=gl.getUniformLocation(this.program,'stroke');this.halfWidth=gl.getUniformLocation(this.program,'halfWidth');
  this.line=new Float32Array(SIGNAL_SAMPLES*2);this.fill=new Float32Array(SIGNAL_SAMPLES*6);this.ribbon=new Float32Array(SIGNAL_SAMPLES*6);
  this.lost=e=>{e.preventDefault();this.failed=true;onError(new Error('Graphics were interrupted. Reload to restore the lines.'));};
  canvas.addEventListener('webglcontextlost',this.lost);this.ready=Promise.resolve();
 }
 resize(width,height){if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}}
 render(analysis,time,settings){
  if(this.disposed||this.failed)return;
  const gl=this.gl,w=this.canvas.width,h=this.canvas.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.colorMask(true,true,true,true);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
  for(let i=0;i<gl.getParameter(gl.MAX_VERTEX_ATTRIBS);i++)gl.disableVertexAttribArray(i);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,0,0);
  const plotW=Math.min(w*.65,h*1.02),plotH=Math.min(h*.60,plotW*.85);
  const left=(w-plotW)/2,top=h*.17,bottom=top+plotH;
  const density=this.canvas.clientWidth>0?w/this.canvas.clientWidth:1;
  const halfWidth=.55*density,outer=halfWidth+1;
  gl.uniform1f(this.halfWidth,halfWidth);
  // Clip the oldest contour as it exits, like a continuous subtitle roll.
  gl.enable(gl.SCISSOR_TEST);gl.scissor(0,Math.floor(h-bottom-2),w,Math.ceil(plotH+plotW*.26+2));
  for(const row of signalRows(analysis,time,settings)){
   const base=top+row.y*plotH;
   for(let x=0;x<SIGNAL_SAMPLES;x++){
    const px=2*(left+x/(SIGNAL_SAMPLES-1)*plotW)/w-1;
    const py=1-2*(base-row.heights[x]*plotW)/h;
    this.line[x*2]=px;this.line[x*2+1]=py;
    this.fill.set([px,py,0,px,1-2*(base+.5)/h,0],x*6);
   }
   gl.disable(gl.BLEND);gl.uniform1f(this.stroke,0);
   gl.uniform4f(this.ink,0,0,0,1);gl.bufferData(gl.ARRAY_BUFFER,this.fill,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLE_STRIP,0,SIGNAL_SAMPLES*2);
   // Explicit pixel-width ribbons avoid native one-pixel LINE_STRIP coverage bands.
   for(let x=0;x<SIGNAL_SAMPLES;x++){
    const prev=Math.max(0,x-1),next=Math.min(SIGNAL_SAMPLES-1,x+1);
    const dx=(this.line[next*2]-this.line[prev*2])*w/2;
    const dy=(this.line[next*2+1]-this.line[prev*2+1])*h/2;
    const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    const px=this.line[x*2],py=this.line[x*2+1];
    this.ribbon.set([px+nx*outer*2/w,py+ny*outer*2/h,outer,px-nx*outer*2/w,py-ny*outer*2/h,-outer],x*6);
   }
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(this.stroke,1);
   gl.uniform4f(this.ink,.9,.9,.9,row.opacity);
   gl.bufferData(gl.ARRAY_BUFFER,this.ribbon,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLE_STRIP,0,SIGNAL_SAMPLES*2);
  }
  gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);
 }
 dispose(){this.disposed=true;this.gl.disableVertexAttribArray(this.position);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.canvas.removeEventListener('webglcontextlost',this.lost);}
}
