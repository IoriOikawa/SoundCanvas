// Preserve the 960×640 glass composition at every preview/export resolution.
export function rainViewScale(width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const relative = aspect / 1.5;
  return relative >= 1 ? [relative, 1] : [1, 1 / relative];
}
