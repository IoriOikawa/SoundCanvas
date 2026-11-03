// MediaRecorder emits streaming WebM with no Duration in Segment Info. Add that
// metadata so local players know the clip length. Encoded clusters stay intact.
function element(bytes, offset) {
  const width = (at) => {
    if (at >= bytes.length || bytes[at] === 0)
      throw new Error("Invalid WebM element.");
    let n = 1;
    while (!(bytes[at] & (128 >> (n - 1)))) n++;
    if (n > 8 || at + n > bytes.length)
      throw new Error("Truncated WebM element.");
    return n;
  };
  const idWidth = width(offset);
  let id = 0;
  for (let i = 0; i < idWidth; i++) id = id * 256 + bytes[offset + i];
  const sizeAt = offset + idWidth,
    sizeWidth = width(sizeAt);
  let size = bytes[sizeAt] & ((1 << (8 - sizeWidth)) - 1);
  let unknown = size === (1 << (8 - sizeWidth)) - 1;
  for (let i = 1; i < sizeWidth; i++) {
    size = size * 256 + bytes[sizeAt + i];
    unknown = unknown && bytes[sizeAt + i] === 255;
  }
  const start = sizeAt + sizeWidth,
    end = unknown ? bytes.length : start + size;
  if (end > bytes.length || !Number.isSafeInteger(end))
    throw new Error("Truncated WebM element.");
  return {
    id,
    offset,
    idWidth,
    sizeAt,
    sizeWidth,
    size: unknown ? null : size,
    start,
    end,
  };
}

function encodeSize(value, minimum = 1) {
  let width = minimum;
  while (value >= 2 ** (7 * width) - 1) width++;
  const bytes = new Uint8Array(width);
  for (let i = width - 1; i >= 0; i--) {
    bytes[i] = value % 256;
    value = Math.floor(value / 256);
  }
  bytes[0] |= 1 << (8 - width);
  return bytes;
}

export function withWebmDuration(input, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("Invalid recording duration.");
  const bytes = new Uint8Array(input);
  const head = element(bytes, 0);
  if (head.id !== 0x1a45dfa3) throw new Error("Invalid WebM header.");
  const segment = element(bytes, head.end);
  if (segment.id !== 0x18538067) throw new Error("Invalid WebM segment.");
  let info = null,
    indexed = false;
  for (let at = segment.start; at < segment.end; ) {
    const child = element(bytes, at);
    if (child.id === 0x114d9b74 || child.id === 0x1c53bb6b) indexed = true;
    if (child.id === 0x1549a966) info = child;
    if (child.size === null) break;
    at = child.end;
  }
  if (!info) return bytes;
  let scale = 1000000,
    duration = null;
  for (let at = info.start; at < info.end; ) {
    const child = element(bytes, at);
    if (child.end > info.end) throw new Error("Invalid WebM information.");
    if (child.id === 0x2ad7b1) {
      scale = 0;
      for (let i = child.start; i < child.end; i++)
        scale = scale * 256 + bytes[i];
    }
    if (child.id === 0x4489) duration = child;
    at = child.end;
  }
  if (!scale) throw new Error("Invalid WebM time scale.");
  const value = (seconds * 1e9) / scale;
  if (duration) {
    const view = new DataView(bytes.buffer);
    if (duration.size === 8) view.setFloat64(duration.start, value);
    else if (duration.size === 4) view.setFloat32(duration.start, value);
    return bytes;
  }
  // Inserting bytes would invalidate existing absolute seek offsets. Indexed
  // outputs already come from a different muxer; leave those containers alone.
  if (indexed) return bytes;
  const entry = new Uint8Array(11);
  entry.set([0x44, 0x89, 0x88]);
  new DataView(entry.buffer).setFloat64(3, value);
  const newSize = encodeSize(info.size + entry.length, info.sizeWidth);
  const result = new Uint8Array(
    bytes.length + entry.length + newSize.length - info.sizeWidth,
  );
  let at = info.sizeAt;
  result.set(bytes.subarray(0, at));
  result.set(newSize, at);
  at += newSize.length;
  result.set(bytes.subarray(info.start, info.end), at);
  at += info.size;
  result.set(entry, at);
  at += entry.length;
  result.set(bytes.subarray(info.end), at);
  // Segment has unknown length after insertion (same VINT width).
  result.fill(255, segment.sizeAt, segment.start);
  result[segment.sizeAt] = (1 << (9 - segment.sizeWidth)) - 1;
  return result;
}
