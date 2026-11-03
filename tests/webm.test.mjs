import test from "node:test";
import assert from "node:assert/strict";
import { withWebmDuration } from "../src/webm.js";

const header = [0x1a, 0x45, 0xdf, 0xa3, 0x80];
const segment = [
  0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
];
const scale = [0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40];
const cluster = [0x1f, 0x43, 0xb6, 0x75, 0xff, 0xa3, 0x81, 0x00];
const sample = () =>
  new Uint8Array([
    ...header,
    ...segment,
    0x15,
    0x49,
    0xa9,
    0x66,
    0x87,
    ...scale,
    ...cluster,
  ]);

test("streaming WebM gets finite duration metadata without modifying encoded media", () => {
  const before = sample(),
    after = withWebmDuration(before, 15);
  const marker = after.findIndex(
    (v, i) => v === 0x44 && after[i + 1] === 0x89 && after[i + 2] === 0x88,
  );
  assert.ok(marker > 0);
  assert.equal(new DataView(after.buffer).getFloat64(marker + 3), 15000);
  assert.deepEqual([...after.slice(-cluster.length)], cluster);
  assert.deepEqual([...before], [...sample()]);
});

test("re-finalizing updates an existing duration without growing the file", () => {
  const first = withWebmDuration(sample(), 15),
    second = withWebmDuration(first, 3.5);
  assert.equal(first.length, second.length);
  const marker = second.findIndex(
    (v, i) => v === 0x44 && second[i + 1] === 0x89 && second[i + 2] === 0x88,
  );
  assert.equal(new DataView(second.buffer).getFloat64(marker + 3), 3500);
});

test("invalid duration and malformed containers are rejected", () => {
  assert.throws(() => withWebmDuration(sample(), NaN));
  assert.throws(() => withWebmDuration(new Uint8Array([0]), 15));
});
