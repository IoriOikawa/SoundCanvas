// Small, locally painted scenes: no remote asset request and identical export inputs.
export function rainBackground(kind='garden') {
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;
 const c=canvas.getContext('2d');let seed=183;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const night=kind==='night',dusk=kind==='dusk';
 const sky=c.createLinearGradient(0,0,0,640);
 sky.addColorStop(0,night?'#182636':dusk?'#a79891':'#d9dfdc');
 sky.addColorStop(1,night?'#15252b':dusk?'#555e60':'#697c63');c.fillStyle=sky;c.fillRect(0,0,960,640);
 c.filter='blur(5px)';
 // Distant houses and roof silhouettes, visible through the defocused glass.
 for(let i=0;i<8;i++){
  const x=i*155-35,y=190+rand()*95,w=100+rand()*90;
  c.fillStyle=night?'#1c2832':dusk?'#5b6265':'#a1aaa0';c.fillRect(x,y,w,280);
  c.beginPath();c.moveTo(x-15,y);c.lineTo(x+w*.5,y-65-rand()*40);c.lineTo(x+w+15,y);c.closePath();c.fillStyle=night?'#17222d':'#68736b';c.fill();
  for(let j=0;j<5;j++){
   c.fillStyle=night||dusk?(rand()>.3?'#e5bd78':'#48575f'):'#839187';
   c.fillRect(x+20+(j%2)*48,y+30+Math.floor(j/2)*62,19,29);
  }
 }
 if(kind==='garden'){
  for(let i=0;i<95;i++){
   const x=rand()*960,y=170+rand()*440,r=18+rand()*75;
   c.fillStyle=`rgba(${55+rand()*30},${78+rand()*35},${49+rand()*30},.48)`;
   c.beginPath();c.ellipse(x,y,r,r*.8,0,0,7);c.fill();
  }
  c.fillStyle='#8c8572';c.beginPath();c.moveTo(490,390);c.lineTo(380,640);c.lineTo(680,640);c.lineTo(520,390);c.fill();
  c.strokeStyle='#57594b';c.lineWidth=8;
  for(let i=0;i<14;i++){c.beginPath();c.moveTo(i*80,420);c.lineTo(i*80,550);c.stroke();}
  c.fillRect(0,462,960,5);
 }else{
  c.fillStyle=night?'#18272f':'#666866';c.beginPath();c.moveTo(465,400);c.lineTo(230,640);c.lineTo(780,640);c.lineTo(525,400);c.fill();
  for(let i=0;i<18;i++){
   const x=rand()*960,y=300+rand()*320;
   c.fillStyle=i%3?'#e6b56b':'#b6d4da';c.shadowColor=c.fillStyle;c.shadowBlur=22;
   c.beginPath();c.arc(x,y,3+rand()*6,0,7);c.fill();
   c.globalAlpha=.2;c.fillRect(x-3,y+15,6,25+rand()*60);c.globalAlpha=1;
  }
 }
 c.shadowBlur=0;c.filter='none';
 return canvas;
}
