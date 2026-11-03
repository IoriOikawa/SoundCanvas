import test from "node:test";
import assert from "node:assert/strict";
import { AudioTransport } from "../src/audio.js";

function transportWithClock() {
  const transport = new AudioTransport();
  transport.context = {
    currentTime: 0,
    state: "running",
    destination: {},
    createBufferSource() {
      return { connect() {}, disconnect() {}, start() {}, stop() {} };
    },
  };
  transport.setBuffer({ duration: 10 });
  return transport;
}

test("seeking a playing track to its end stops there instead of restarting", async () => {
  const transport = transportWithClock();
  await transport.play();
  transport.context.currentTime = 2;
  await transport.seek(10);
  assert.equal(transport.time, 10);
  assert.equal(transport.playing, false);
});

test("seeking within a playing track preserves playback and the audio clock", async () => {
  const transport = transportWithClock();
  await transport.play();
  await transport.seek(5);
  transport.context.currentTime = 1;
  assert.equal(transport.time, 6);
  assert.equal(transport.playing, true);
  transport.pause();
  transport.context.currentTime = 3;
  assert.equal(transport.time, 6);
});

test("seeking just before the end never rewinds to the beginning", async () => {
  const transport = transportWithClock();
  await transport.play();
  await transport.seek(9.995);
  assert.equal(transport.time, 9.995);
  assert.equal(transport.playing, true);
});
