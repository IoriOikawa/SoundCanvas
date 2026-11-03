# Pool Light sources

Pool Light adapts Evan Wallace's **WebGL Water** (2011):
https://github.com/evanw/webgl-water
Pinned source commit: `73eda8be832b649367b25ea5690c1f0181bb56ad`.

The water, optical rendering, cubemap and LightGL sources retain their original
MIT notices in `vendor/webgl-water/`. SoundCanvas wraps them as isolated ES modules,
passes its existing canvas and local tile image explicitly, removes demo-wide input
listeners, fixes implicit variables for strict modules, and adds seeded musical
impulses, fixed steps, checkpoints, camera controls, recording and resource cleanup.
The heightfield simulation is adapted for a rectangular physical domain with
world-space disturbances, stable axis-specific propagation coefficients, and
world-space height derivatives. `src/water-caustics.js` adapts Evan’s differential
area method to the hall’s physical floor projection. `src/water-surface.js` adds
small analytic waves with shared height/gradient definitions. The original optical shaders remain in the vendored source, while
`src/pool-hall-shaders.js` supplies new room intersections, architecture, white
procedural tiles, daylight and reflection/refraction for the hall. The original
cutaway pool, sphere and sky cubemap are no longer rendered. The five sky images
remain bundled from the reference repository but are not loaded by the hall.

`assets/water/tiles.jpg` is the tile texture bundled in the original demo, credited
to **Patrick Hoesly (zooboing)**:
https://www.flickr.com/photos/zooboing/3682834083/
Licensed under **Creative Commons Attribution 2.0 Generic**:
https://creativecommons.org/licenses/by/2.0/
The Flickr page's structured license metadata and description confirm this license.
The bundled image is unchanged from Evan's repository; rendering repeats and lights
it on the pool walls and floor.

MIT License — Copyright (c) 2011 Evan Wallace

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
