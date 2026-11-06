export const SIGNAL_INTERVAL = .18;
export const SIGNAL_LIMIT = 64;
export const SIGNAL_SAMPLES = 128;

// Each contour records a completed audio slice. Older contours never morph.
export function signalRows(analysis,time,settings){
 if(!analysis?.lineProfiles)return Array.from({length:SIGNAL_LIMIT},(_,id)=>({id,y:id/(SIGNAL_LIMIT-1),opacity:.45,heights:new Float32Array(SIGNAL_SAMPLES)}));
 const position=Math.max(0,Math.min(Number.isFinite(time)?time:0,analysis.duration))/SIGNAL_INTERVAL;
 const complete=Math.min(Math.floor(position+1e-8),Math.floor(analysis.lineProfiles.length/SIGNAL_SAMPLES));
 const fraction=position-Math.floor(position+1e-8);
 const first=Math.max(0,complete-SIGNAL_LIMIT),rows=[];
 for(let id=first;id<complete;id++){
  const heights=new Float32Array(SIGNAL_SAMPLES),radius=1+Math.round(settings.resonance*3);
  for(let x=1;x<SIGNAL_SAMPLES-1;x++){
   const u=x/(SIGNAL_SAMPLES-1),width=.19+settings.growth*.18;
   const center=Math.max(0,1-Math.abs(u-.5)/width);
   const envelope=center*center*(3-2*center);
   let sum=0,weight=0;
   for(let j=-radius;j<=radius;j++){
    const at=Math.max(0,Math.min(SIGNAL_SAMPLES-1,x+j)),w=radius+1-Math.abs(j);
    sum+=analysis.lineProfiles[id*SIGNAL_SAMPLES+at]*w;weight+=w;
   }
   heights[x]=envelope*(sum/weight)*(.045+settings.impact*.20);
  }
  rows.push({id,y:(SIGNAL_LIMIT-complete+id-fraction)/(SIGNAL_LIMIT-1),opacity:Math.min(1,(complete-id-1+Math.max(0,fraction))*4),heights});
 }
 return rows;
}
