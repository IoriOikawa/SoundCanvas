# Stanford Bunny model

Original scanned model: **Stanford Computer Graphics Laboratory**, Stanford University; Greg Turk and Marc Levoy. [Stanford 3D Scanning Repository](https://graphics.stanford.edu/data/3Dscanrep/).

Local mesh derived from Mikola Lysenko's **bunny** package (package metadata declares Public Domain):

- [Pinned source mesh](https://github.com/mikolalysenko/bunny/blob/d70c5da8e02ee56d20ec3360e0859f37fada81ba/index.js)
- [Pinned package metadata](https://github.com/mikolalysenko/bunny/blob/d70c5da8e02ee56d20ec3360e0859f37fada81ba/package.json)
- Source: 1,839 vertices and 3,674 triangles.
- Transformation: center the bounding box; scale its longest dimension to 3.8 units; apply one Loop subdivision. Result: 7,350 vertices and 14,696 triangles, stored in `src/bunny-data.js`.
- Regenerate: download the pinned source, then run `python3 scripts/prepare-bunny.py /path/to/index.js` from the project root. The script parses only JSON arrays; it does not execute the downloaded JavaScript.

The browser uses the bundled local mesh; no runtime model service or npm dependency is required. SoundCanvas adds copper shading and time-indexed audio deformation. This is a modified scan, not a rigged or animated anatomical model.
