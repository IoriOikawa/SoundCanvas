import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePCM } from '../src/analysis.js';
import { signalRows, SIGNAL_INTERVAL, SIGNAL_LIMIT } from '../src/signal-lines.js';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from '../src/model.js';
const settings={...DEFAULT_SETTINGS,scene:'signal'};
function track(silent=false){const sr=8000;const pcm=Float32Array.from({length:sr*15},(_,i)=>silent?0:Math.sin(i*.17)*(.3+.25*Math.sin(i/sr*7)));return analyzePCM(pcm,sr);}
test('only completed slices enter below old rows, which move upwards with a fixed cap',()=>{
 const a=track();assert.equal(signalRows(a,.1,settings).length,0);
 const early=signalRows(a,SIGNAL_INTERVAL*4+.02,settings);
 const later=signalRows(a,SIGNAL_INTERVAL*5+.02,settings);
 assert.equal(early.length,4);assert.equal(later.length,5);
 assert.equal(early[0].id,later[0].id);assert.ok(later[0].y<early[0].y);
 assert.deepEqual(early[0].heights,later[0].heights);
 const full=signalRows(a,14,settings);assert.equal(full.length,SIGNAL_LIMIT);
 assert.ok(full.every((r,i)=>i===0||r.y>full[i-1].y));
 assert.deepEqual(signalRows(a,1,settings),signalRows(a,1,settings));
});
test('silence is flat and waveform profiles reflect the actual decoded track',()=>{
 const silent=track(true),a=track();
 assert.ok(signalRows(silent,2,settings).every(r=>r.heights.every(h=>h===0)));
 const rows=signalRows(a,2,settings);assert.ok(rows.some(r=>r.heights.some(h=>h>.01)));
 assert.notDeepEqual(rows[0].heights,rows[1].heights);
 assert.ok(rows.every(r=>r.heights[0]===0&&r.heights.at(-1)===0));
 assert.deepEqual(parseSettings(serializeSettings(settings)),settings);
});
test('scroll is continuous across a new row boundary and independent of seek order',()=>{
 const a=track(), boundary=2.16;
 const before=signalRows(a,boundary-1e-5,settings),after=signalRows(a,boundary+1e-5,settings);
 const same=after.find(r=>r.id===before.at(-1).id);
 assert.ok(Math.abs(same.y-before.at(-1).y)<.0001);
 const atSix=signalRows(a,6,settings);signalRows(a,12,settings);signalRows(a,.1,settings);
 assert.deepEqual(signalRows(a,6,settings),atSix);
 assert.ok(atSix.every(r=>(r.id+1)*SIGNAL_INTERVAL<=6));
});
