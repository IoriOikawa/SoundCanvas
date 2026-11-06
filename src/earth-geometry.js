const normalize = (vector) => {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
};

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function buildColumnMesh(samples, stride = 6) {
  const count = samples.length / stride;
  const sides = 6;
  const vertexCount = count * sides * 2;
  const root = new Float32Array(vertexCount * 3);
  const tangent = new Float32Array(vertexCount * 3);
  const bitangent = new Float32Array(vertexCount * 3);
  const local = new Float32Array(vertexCount * 3);
  const sampleIndex = new Uint16Array(vertexCount);
  const indices = new Uint16Array(count * 60);
  const width = 0.0105;
  let indexAt = 0;

  for (let sample = 0; sample < count; sample++) {
    const at = sample * stride;
    const normal = normalize([
      samples[at],
      samples[at + 1],
      samples[at + 2],
    ]);
    const tangentVector = normalize(
      cross(Math.abs(normal[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0], normal),
    );
    const bitangentVector = normalize(cross(normal, tangentVector));
    const base = sample * sides * 2;

    for (let tip = 0; tip < 2; tip++) {
      for (let side = 0; side < sides; side++) {
        const vertex = base + tip * sides + side;
        const out = vertex * 3;
        const angle = (side / sides) * Math.PI * 2;
        root.set(normal, out);
        tangent.set(tangentVector, out);
        bitangent.set(bitangentVector, out);
        local.set(
          [Math.cos(angle) * width, Math.sin(angle) * width, tip],
          out,
        );
        sampleIndex[vertex] = sample;
      }
    }

    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      indices.set(
        [
          base + side,
          base + next,
          base + sides + side,
          base + next,
          base + sides + next,
          base + sides + side,
        ],
        indexAt,
      );
      indexAt += 6;
    }
    for (let side = 1; side < sides - 1; side++) {
      indices.set([base, base + side + 1, base + side], indexAt);
      indexAt += 3;
      indices.set(
        [base + sides, base + sides + side, base + sides + side + 1],
        indexAt,
      );
      indexAt += 3;
    }
  }

  return {
    vertexCount,
    root,
    tangent,
    bitangent,
    local,
    sampleIndex,
    indices,
  };
}

export function buildSphere(longitudes = 48, latitudes = 32) {
  const vertexCount = (longitudes + 1) * (latitudes + 1);
  if (vertexCount >= 65536)
    throw new Error("Earth sphere exceeds WebGL 1 index limits.");
  const positions = new Float32Array(vertexCount * 3);
  let at = 0;
  for (let latitude = 0; latitude <= latitudes; latitude++) {
    const phi = -Math.PI / 2 + (latitude / latitudes) * Math.PI;
    const radius = Math.cos(phi);
    for (let longitude = 0; longitude <= longitudes; longitude++) {
      const theta = (longitude / longitudes) * Math.PI * 2;
      positions[at++] = radius * Math.cos(theta);
      positions[at++] = Math.sin(phi);
      positions[at++] = radius * Math.sin(theta);
    }
  }
  const indices = new Uint16Array(longitudes * latitudes * 6);
  let indexAt = 0;
  const row = longitudes + 1;
  for (let latitude = 0; latitude < latitudes; latitude++) {
    for (let longitude = 0; longitude < longitudes; longitude++) {
      const lower = latitude * row + longitude;
      const upper = lower + row;
      indices.set(
        [lower, upper, lower + 1, lower + 1, upper, upper + 1],
        indexAt,
      );
      indexAt += 6;
    }
  }
  return {
    vertexCount,
    positions,
    normals: new Float32Array(positions),
    indices,
  };
}
