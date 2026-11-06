import test from 'node:test';
import assert from 'node:assert/strict';
import { rainViewScale } from '../src/rain-layout.js';
test('rain composition keeps equal pixel scaling on wide, portrait and export canvases',()=>{
 for(const [w,h] of [[960,640],[2000,510],[1280,720],[390,600]]){
  const [x,y]=rainViewScale(w,h);
  assert.ok(Math.abs(w/x/960-h/y/640)<1e-10);
  assert.ok(x>=1&&y>=1);
  assert.equal(Math.min(x,y),1);
 }
 assert.deepEqual(rainViewScale(960,640),[1,1]);
});
