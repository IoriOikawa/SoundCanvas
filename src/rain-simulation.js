import { sampleFeatures } from './analysis.js?v=signal-aa-1';
const eventCache = new WeakMap();
export function rainEvents(analysis) {
 if (!analysis) return [];
 if (eventCache.has(analysis)) return eventCache.get(analysis);
 const events=[];
 let last=-8;
 for(let i=1;i<analysis.onset.length-1;i++) {
  const t=i*analysis.step, v=analysis.onset[i];
  if(v>.35 && v>analysis.onset[i-1] && v>=analysis.onset[i+1] && t-last>7) {
   events.push({time:t,strength:v});last=t;
  }
 }
 eventCache.set(analysis,events);return events;
}
export function rainFlash(analysis,time,settings) {
 if(!settings.rainLightning) return 0;
 let light=0;
 for(const event of rainEvents(analysis)) {
  const age=time-event.time;
  if(age>=0 && age<1.2) light=Math.max(light,event.strength*(1-Math.exp(-age*60))*Math.exp(-age*6));
 }
 return light * settings.impact;
}
export function mergeDrops(a,b) {
 const aa=a.r*a.r,bb=b.r*b.r,area=aa+bb;
 a.x=(a.x*aa+b.x*bb)/area;a.y=(a.y*aa+b.y*bb)/area;
 a.r=Math.sqrt(area);a.v=Math.max(a.v,b.v);
}
export class RainSimulation {
 constructor(){this.frame=-1;this.key='';this.drops=[];this.trails=[];}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(analysis,settings,key){
  this.analysis=analysis;this.key=key;this.seed=(settings.seed+431)>>>0;this.frame=0;this.credit=0;this.lastAccent=-1;this.drops=[];this.trails=[];
  for(let i=0;i<115;i++)this.spawn(true);
 }
 spawn(initial=false,accent=false){
  if(this.drops.length>=180)return;
  const x=.06+this.random()*.88,y=.03+this.random()*.86;
  if(Math.abs(x-.5)<.025 || Math.abs(y-.23)<.021)return;
  this.drops.push({x,y,pane:y<.23?0:1,r:accent?.006+this.random()*.005:.0015+this.random()**3*(initial?.009:.005),v:0,phase:this.random()*6.28});
 }
 step(settings){
  const t=this.frame/30,f=sampleFeatures(this.analysis,t);
  this.credit+=(2.8+f.memory*9+f.high*settings.growth*15)/30;
  while(this.credit>=1){this.spawn();this.credit--;}
  if(f.onset>.23 && t-this.lastAccent>.23 && this.random()<.15+settings.impact*.65){this.spawn(false,true);this.lastAccent=t;}
  for(const d of this.drops){
   const oldY=d.y;
   const moving=d.r>.0077;
   d.v=Math.min(.19,Math.max(0,d.v+(moving?.017+d.r*2:-.4)/30));
   d.y+=d.v/30;
   d.x+=Math.sin(d.y*62+d.phase)*d.v*.032/30;
   if(d.y-oldY>.00007 && this.frame%3===0){
    this.trails.push({x:d.x,y:oldY,end:d.y,r:d.r*.2,life:1});
    d.r=Math.max(.005,d.r-.000018);
   }
  }
  // Spatial buckets keep collision checks local as droplets accumulate.
  const grid=new Map(),dead=new Set();
  for(let i=0;i<this.drops.length;i++){
   const a=this.drops[i],gx=Math.floor(a.x*20),gy=Math.floor(a.y*20);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    for(const j of grid.get(`${gx+dx},${gy+dy}`)||[]){
     if(dead.has(j))continue;
     const b=this.drops[j];
     if(Math.abs(a.x-.5)<.027 || (a.x<.5)!==(b.x<.5) || (a.y<.23)!==(b.y<.23))continue;
     if(Math.hypot(a.x-b.x,(a.y-b.y)*.72)<(a.r+b.r)*.72){mergeDrops(a,b);dead.add(j);}
    }
   }
   const k=`${gx},${gy}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);
  }
  this.drops=this.drops.filter((d,i)=>!dead.has(i)&&d.y<(d.pane===0?.209:.895)&&d.r<.038);
  for(const tr of this.trails)tr.life-=1/(30*(5+settings.resonance*15));
  this.trails=this.trails.filter(tr=>tr.life>0).slice(-1400);
  this.frame++;
 }
 advance(analysis,time,settings,budget=180){
  const target=Math.max(0,Math.floor(time*30+1e-6));
  const key=[settings.seed,settings.impact,settings.resonance,settings.growth].join(':');
  if(this.analysis!==analysis||this.key!==key||target<this.frame)this.reset(analysis,settings,key);
  const end=Math.min(target,this.frame+budget);
  while(this.frame<end)this.step(settings);
  return this.frame===target;
 }
}
