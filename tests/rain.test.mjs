import test from 'node:test';
import assert from 'node:assert/strict';
import { RainSimulation, mergeDrops, rainFlash } from '../src/rain-simulation.js';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from '../src/model.js';
const settings = {...DEFAULT_SETTINGS, scene:'rain', rainBackground:'garden', rainLightning:true};
test('rain seeking reconstructs identical drops and trails independently of display cadence', () => {
 const a=new RainSimulation(), b=new RainSimulation();
 for(let t=0;t<=12;t+=.25) a.advance(null,t,settings,Infinity);
 b.advance(null,12,settings,Infinity);
 assert.deepEqual(a.drops,b.drops); assert.deepEqual(a.trails,b.trails);
 b.advance(null,3,settings,Infinity); b.advance(null,12,settings,Infinity);
 assert.deepEqual(a.drops,b.drops);
 const before=JSON.stringify(b.drops);
 b.advance(null,12,{...settings,rainBackground:'night',rainLightning:false},Infinity);
 assert.equal(JSON.stringify(b.drops),before);
});
test('rain settings roundtrip and invalid background is rejected',()=>{
 assert.deepEqual(parseSettings(serializeSettings(settings)),settings);
 assert.throws(()=>parseSettings(serializeSettings({...settings,rainBackground:'invalid'})));
});
test('merged rain drops conserve area and rain remains finite and bounded',()=>{
 const a={x:.2,y:.3,r:.01,v:0}, b={x:.21,y:.31,r:.02,v:.1};
 const area=a.r*a.r+b.r*b.r;mergeDrops(a,b);assert.ok(Math.abs(a.r*a.r-area)<1e-10);
 const sim=new RainSimulation();sim.advance(null,120,settings,Infinity);
 assert.ok(sim.drops.length<=180);
 assert.ok(sim.drops.every(d=>[d.x,d.y,d.r,d.v].every(Number.isFinite)));
 assert.equal(rainFlash(null,4,settings),0);
 assert.equal(rainFlash(null,4,{...settings,rainLightning:false}),0);
});
test('music changes rain and lightning is sparse, silent-safe and independently switchable',()=>{
 const n=1001,make=()=>({duration:20,step:.02,...Object.fromEntries(['energy','low','mid','high','onset','memory'].map(k=>[k,new Float32Array(n)]))});
 const silence=make(),music=make();
 music.energy.fill(.8);music.memory.fill(.7);music.high.fill(.8);
 for(const i of [50,100,450]) music.onset[i]=.8;
 const a=new RainSimulation(),b=new RainSimulation();a.advance(silence,10,settings,Infinity);b.advance(music,10,settings,Infinity);
 assert.notDeepEqual(a.drops,b.drops);
 assert.equal(rainFlash(silence,1.1,settings),0);
 assert.ok(rainFlash(music,1.1,settings)>0);
 assert.equal(rainFlash(music,2.3,settings),0);
 assert.equal(rainFlash(music,1.1,{...settings,rainLightning:false}),0);
});
