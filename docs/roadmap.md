# SoundCanvas visual directions

## Implemented locally — Pool Light

Sunlit white-tile hall with a large inset pool, side windows and skylights. Evan Wallace’s GPU heightfield and projected caustics drive the water; the hall renderer uses the same room geometry for direct, reflected and refracted rays. The previous black-background cutaway pool is retired. Music should gently change visual behavior without overwhelming the calm character. Preserve Stanford Bunny as another scene.

## Implemented locally — Underwater view and floating duck

WASD moves relative to the camera; Q/E dives and rises within the basin. Underwater floor lighting uses projected caustics. A procedural rubber duck samples the water surface to bob and tilt, with a persisted independent on/off switch. The supplied GLB replacement is not integrated in this milestone.

## Parked experiment — Musical drops

Ball drops are disabled in the current experience. Earlier trajectory and event-selection code remains available for a future object that makes an interesting addition to the pool floor.

## Future scenes

- **Rain window:** nearby droplets, merging and sliding trails, a blurred outside world, refraction and small areas of clarity. See the earlier Codrops and Heartfelt references.
- **Expanded underwater / mermaid viewpoint:** the user's diving memory of looking upward from the seabed, seeing the surrounding underwater space, the surface overhead and moving light patterns. The current pool already supports diving; a broader underwater environment remains a future direction.

## Audio treatment — after the pool-light scene

The user wants a later transition into an underwater listening impression: shore-side music heard from inside a pool, muffled but subjectively balanced, with moving-water sound. Treat this as an artistic listening goal rather than a claim about a universally uniform underwater frequency spectrum. Discuss the exact experience after the visual scene is established. Do not introduce filtering, water ambience or a new audio chain as part of Pool Light.
