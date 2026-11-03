# SoundCanvas v1 verification

## Pool Light update — 2026-11-02

Added Pool Light as a second studio scene. Preview and recorded film share `createSceneRenderer`. The pool uses a fullscreen procedural light network with bounded music modulation and a subtle floor grid, not a physically simulated water volume. The scene selector and independent pool pan persist in settings. Old settings files without a scene field still restore the bunny; the local pre-scene cache is migrated once to show the new pool scene without changing the three control values.

All 26 tests pass, including visual parameter bounds/determinism, scene settings compatibility, startup failure cleanup for both scenes and repeated shared-context scene transitions. Independent review identified an enabled-vertex-attribute lifetime bug: after bunny buffers were deleted, the pool could fail to redraw. A failing regression reproduced that boundary; both renderers now disable owned attributes before deleting buffers. Review and real-browser repeated switching verified the fix.

Browser checks covered the pool preview, unchanged music playback, switching during playback, bunny return, pool pan/reset, all three controls, pool settings download/restore, legacy bunny file restore, and a 390×844 layout. The viewport override was reset. The controls were returned to the user's initial values after checking them. No console warnings/errors were reported during the final checks.

The actual downloaded pool recording contains 15.00-second duration metadata, 1280×720 VP9 at 30 fps, 450 decoded frames and stereo Opus audio (mean −11.6 dB). An extracted frame was visually checked: it contains the pool light, not the bunny. The selector is disabled during recording and the prior paused position is restored afterward.

Audio continues to connect directly to the output/recording destination. No underwater filter, ambience, convolver or other acoustic treatment was added. The underwater/mermaid viewpoint and muffled shore-music/water-sound idea are recorded in `docs/roadmap.md` for later work.

## Fur update — 2026-11-02

Added an optional warm-ivory coat with 24 alpha-tested shells and tapered procedural fibers, with static rest-space roots to keep the pattern attached during deformation. Growth changes coat length; Impact and Resonance shape audio-driven sway. The material button switches back to copper, remains usable on narrow layouts, persists in settings and is locked while recording.

All 20 tests pass, including silent/no-input coat behavior, bounds, boolean settings validation, older-settings defaults, growth response and deterministic parameter sampling. Read-only review found no blockers in the new buffers, cleanup, shaders, settings or export locking. Real-browser preview checked fur/copper toggling, music playback and coat-length adjustment. The user's prior three control values were restored after checking Growth.

A fresh downloaded 15-second fur recording was decoded with FFmpeg: 1280×720 VP9, 450 decoded frames, stereo Opus, 15.00-second duration metadata, non-silent audio (mean −11.6 dB). An extracted frame was visually inspected to confirm the fur appears in the saved film. No browser console errors or warnings were reported. This records one device/browser, not a general performance guarantee.

The implementation uses a shell-coat approach related to [NVIDIA's shell/fins description](https://developer.download.nvidia.com/SDK/10/direct3d/Source/Fur/doc/FurShellsAndFins.pdf); this version uses opaque alpha-tested shells with depth writing rather than alpha-blended layers, and does not implement silhouette fins or physical strand simulation.

## Stanford Bunny update — 2026-11-02

The single studio form was replaced with a bundled Stanford Bunny mesh. The original six remain behind the classic entry point. Source and generation are documented in `assets/BUNNY-NOTICE.md`; the app adds no runtime model fetch or package dependency.

All 17 tests pass, including rest/silent mesh preservation and deterministic audio deformation. Independent review validated 7,350 vertices, 14,696 triangles, indices, closed oriented topology, nondegenerate triangles, nonzero normals and no mutation of base mesh data. Browser preview, music playback, orbit/reset and a fresh 15-second export were exercised with no console errors. FFmpeg confirmed 15.00-second duration, VP9 1280×720 at 30 fps, stereo Opus audio with mean −11.6 dB. Default camera and distance were adjusted to show the ears, face and feet.

Browser module caching initially displayed the old shell under the updated label. Versioned entry/dependency URLs were added, then the rendered bunny was verified directly. Existing local control values are preserved; the old form's stored camera is migrated to the bunny's default view.

The sections below record the initial studio verification before the bunny replacement.

Date: 2026-11-02. Implementation is local and uncommitted on `codex/sound-sculpture-v1`.

## Automated checks

`npm test`: 16 tests pass. Coverage includes silent PCM, low/high band separation, transient decay, quiet/loud input, feature bounds and interpolation, deterministic geometry across seeks, valid and invalid settings, export clip boundaries, streaming WebM duration metadata, playback clock and endpoint behavior, and cleanup after synchronous recording-start rejection.

The transport and recorder-error tests stub browser boundaries unavailable in Node. Geometry, analysis, settings and WebM metadata tests exercise the real computational implementations. Tests for the two review findings were observed failing before the fixes.

`git diff --check` passed. New JavaScript modules were checked with Node's syntax checker. Formatting uses Prettier 3.6.2; production has no npm dependencies.

## Real browser checks

Checked in the Codex in-app browser on this Mac, served over local HTTP:

- Default demo loads, analyzes in a worker, plays, pauses and seeks.
- Sliders update; settings persist through refresh. Valid JSON restores controls and camera; invalid values show an error while preserving current settings. Settings download contains the expected values.
- A generated 20-second WAV imports and plays. A non-audio file named WAV fails with a readable error, and a valid file can be loaded afterward.
- Recording locks conflicting controls. Cancellation restores the exact prior paused position.
- A 15-second clip exports successfully. A requested 15-second clip from second 17 of a 20-second track produces a 3-second film and restores second 17.
- A full 30-second recording exports successfully and resumes the track from its prior playing position, rather than the recording end.
- Seeking to the final milliseconds while playing stops at the end rather than restarting.
- Desktop and 390×844 layouts were visually inspected; the narrow layout stacks the viewer and controls. The viewport override was reset afterward.
- Main studio browser console reported no warnings/errors during these checks.

## Downloaded media inspection

Inspected the actual downloaded recordings with FFmpeg, outside the application:

| Sample         | Container and video                       | Audio                | Measured evidence                                      |
| -------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------ |
| Full recording | WebM, VP9, 1280×720, approximately 30 fps | Opus, 48 kHz, stereo | Duration metadata 30.00 s; decoded audio mean −10.4 dB |
| Tail clip      | WebM, VP9, 1280×720, 30 fps               | Opus, 48 kHz, stereo | Duration metadata 3.00 s; decoded audio mean −18.4 dB  |

A frame extracted from the downloaded tail clip was visually inspected: it contains the lit copper sculpture, rather than a blank canvas. The initial 15-second streaming output lacked Duration metadata; the finalizer was added, regression-tested, and verified on both an existing recording and fresh browser output.

The first 15-second recording yielded about 447 frames; delivery is real-time and device-dependent. This does not establish frame-perfect timing or universal 30 fps. Source audio begins roughly 40 ms after the container start in the tested recordings; no sample-accurate audio/video synchronization claim is made.

## Independent review

A read-only code review found an endpoint-seeking rewind and leaked cancellation listeners on synchronous recorder startup failure. Both were reproduced with failing tests, corrected, and retested. Follow-up review identified a remaining 10 ms rewind tolerance; it was removed and covered by a near-end regression test.

## Limits of this verification

No physical-phone, Safari, Firefox or cross-device compatibility matrix was run. A narrow browser viewport verifies layout, not mobile codec or GPU support. Tab-hiding cancellation is implemented but was not separately exercised as a manual browser test. No formal usability study or sustained performance benchmark has been completed. Realtime recording may drop frames under load. A full offline encoder, beat tracking, semantic segmentation and MIDI are outside v1.


## Pool Light correction — actual WebGL Water (2026-11-02)

The preceding procedural version passed functional checks but the user correctly
reported that it looked like vibrating jelly. Those checks did not establish
visual fidelity. Replaced it with Evan Wallace's original MIT water simulation
and optical rendering, pinned to source commit
`73eda8be832b649367b25ea5690c1f0181bb56ad`. Local tiles are the original Patrick
Hoesly image, confirmed on the Flickr page as CC BY 2.0; credits are in the UI
explanation and `assets/WATER-NOTICE.md`.

- Browser preview `index.html?v=water-3` visibly shows the tiled 3D pool, reflected
  environment/sphere, refracted floor and caustic light. This is retained source
  rendering, rather than a newly approximated light texture.
- Loaded and played the demo, paused, sought to 43 seconds and back to 7 seconds;
  switched pool → furry bunny → pool without graphics warnings/errors. The
  browser console check returned no errors or warnings.
- Checked another 7 → 24 → 7 second round trip at a fixed 1024×800 viewport.
  The visible water/pool region in the paired screenshots was pixel-identical;
  differences were confined to the page heading/overlay area above the pool.
  Restored the browser viewport override afterward.
- Exported an actual 15-second film from 7 seconds. Browser restored the paused
  7-second playhead and enabled controls after recording.
  `/Users/paperneko/Downloads/Ring On Your Way-soundcanvas (5).webm` decoded as
  VP9, 1280×720, 450 frames, 30 fps, 15.00 seconds; Opus stereo 48 kHz audio,
  mean volume −11.0 dB. Inspected an extracted frame: actual water and caustics
  are present in the film, not a blank canvas or the retired shader.
- 31 Node tests pass, including deterministic/bounded water inputs, local image
  initialization errors, disposal before pending image completion, cancellation
  while image loading remains pending, and recorder-start cleanup.
- A separate code review found blocking synchronous long-history replay and
  cancellation waiting for pending images. Both were corrected and re-reviewed:
  replay is bounded to 60 fixed frames per batch, yields between preparation
  batches, and checks cancellation; ready/preparation waits race the abort
  signal so transport restoration and disposal are immediate. Ambient time
  starts when the pool renderer is created. No important remaining issue was
  reported in that focused re-review.
- Vendored modules pass `no-undef` lint after fixing the original demo's implicit
  globals for strict ES module scope. Immediate-mode debug allocation and global
  demo input listeners are disabled; the studio owns its controls and resources.

Limits: tested in this desktop browser, not a browser/device matrix. Large uncached
seeks still need replay time, though the interface remains responsive and export
preparation can be cancelled. The underlying solver is Evan's heightfield demo;
this is not a general 3D fluid simulation. Source attribution is essential to the
portfolio presentation. No underwater audio filtering or ambience was added.

UI evidence: `soundcanvas-real-water.png` in the current visualization output
folder; exported frame evidence: `/tmp/soundcanvas-qa/real-water-export.png`.


## Sunlit white-tile pool hall — 2026-11-02

User approved a first scene built around sunlight, a large pool, white tiles,
and an empty skylit room. Their supplied image is a composition/mood reference,
not an image texture or a request to recreate its complex rainbow effects.

Implemented `src/pool-hall.js`, `pool-hall-shaders.js`, and
`pool-hall-renderer.js`. The hall is constructed from analytical architectural
surfaces: inset pool, raised coping/walkways, tiled walls and floor, repeated
columns/ceiling beams, side windows and roof openings. A bounded pool-edge camera
replaces the orbit around a cutaway box. Direct, reflected and refracted rays use
the same room. Evan's water heightfield, fixed simulation steps, checkpoints and
caustic projection remain the basis of the water; sunlight direction is shared
between the hall and caustic calculation. The static demo sphere is no longer
drawn. Controls were recolored for the bright scene, and the unloaded audio
playhead remains at 00:00 while the ambient pool preview moves.

Verification:

- 33 Node tests pass, including the new camera's in-room/above-water bounds,
  orthonormal view basis, deterministic settings mapping, and camera movement.
- Browser `index.html?v=hall-5`: room appears with large water surface, white
  tiles, side windows, skylights and their moving reflections; no black void or
  visible external pool box. Checked the screenshot against the three required
  elements. This is a deliberately simplified first architectural scene.
- Played the demo, paused, switched pool → furry bunny → pool, sought to 20 and
  back to 5 seconds, used keyboard view movement and reset. Scene switching,
  saved controls and audio transport remain functional.
- Checked the narrow layout at 390×844: pool and labels stay inside the viewport,
  controls stack below the player. Reset the viewport override afterward.
- Browser console returned no warnings/errors after scene switching and export.
- Final hall-5 film: `/Users/paperneko/Downloads/Ring On Your Way-soundcanvas (7).webm`.
  Recorded 15 seconds from the paused 5-second playhead, then restored that
  position and enabled controls. Decoded actual media: VP9 1280×720, 30 fps,
  450 frames, 15.00 seconds; Opus stereo 48 kHz, mean audio level −11.6 dB.
  Visually inspected an extracted frame showing the actual room and water.
- Focused independent code review reported no important blocker in GL cleanup,
  ray intersections, camera compatibility or shared preview/export path. Its
  daylight-direction observation was fixed by sharing `POOL_SUN`.

Evidence in the visualization output folder: `soundcanvas-pool-hall.png` (UI)
and `pool-hall-film-frame.png` (decoded final recording).

Limits: simple daylight/shadow and material approximations, not a path-traced
architectural render or a recreation of the reference's rainbow lighting.
Water remains a heightfield; accent detection/throwing, splashes, Bunny-in-water
optics and underwater audio are future work, not included in this first hall.


## Pool navigation and finer tiles — 2026-11-02

Added held-key WASD planar movement relative to the current view direction, with
normalized diagonal speed, elapsed-time movement, a fixed 1.05 camera height and
bounds inside the hall/columns. It is an observation camera and can move above
the water. Drag/arrows retain look control. Pointer interaction focuses the
canvas; form controls and the explanation modal do not capture navigation keys.
Key state clears on canvas/window blur, tab hiding, busy state and scene changes.
Reset view restores both position and look direction. Position persists in local
storage and settings files; legacy files default to the original pool-edge
location. White tile density increased from 2.3 to 3.1 cells per scene unit.

- 35 Node tests pass, including view-relative movement, opposite-key cancellation,
  diagonal speed, bounds, camera height, saved position and old-file compatibility.
- Browser `index.html?v=walk-1`: held W/D then S/A, observed forward/sideways and
  reverse motion, and checked Reset view. Downloaded settings recorded actual
  moved coordinates `poolX: 1.2486898572`, `poolZ: 1.7690049216`.
- Updated on-canvas help says “WASD to move · Drag to look”. Finer tiles are visible
  on the pool floor and room walls. Browser logs returned no warnings/errors.
- Evidence: `soundcanvas-pool-wasd.png` in the visualization output folder.


## Water scale / optical slope correction — 2026-11-02

User approved correcting the jelly-like material by preserving hall dimensions,
fixing stretched waves and matching optical normals to height, then adding small
fine ripples. Root cause: the previous 256² square simulation was mapped over a
7.4×24 rectangle, while optical normals were independently multiplied by .85/.48.

Changes:

- `src/water-surface.js` shares dimensions, height scale and wave parameters.
  The primary simulation is now 128×416 with physical cell sizes ~0.0578/0.0577.
  Per-axis coefficients `(c*dt/cell)^2` implement stable isotropic propagation;
  disturbances measure world-space distance, so their physical footprint is round.
- The vendored solver accepts rectangular dimensions and physical units. Its
  encoded normals derive from the same 1.8 height scale and physical cell spacing
  used in surface intersection. Reflection/refraction no longer apply arbitrary
  per-axis normal multipliers.
- Three directional fine waves have amplitudes 0.22–0.45 mm and wavelengths
  0.13–0.31 units. Height and analytic derivatives are generated from one set of
  definitions; they contribute consistently to surface intersection, optical
  normals and caustics. Fine-wave time is the same fixed simulation frame/60.
- `src/water-caustics.js` adapts Evan's differential-area method to world-space
  floor projection and the shared surface, replacing the old square-domain optical
  mapping. Checkpoint texture sizes follow the new simulation dimensions.

Verification:

- Observed the new tests fail before implementation. All 38 Node tests pass,
  including physical cell spacing, CFL stability/isotropy, equal world slopes on
  both axes, and finite-difference validation of fine-wave derivatives.
- Browser `index.html?v=water-scale-2` compiled and rendered the corrected water.
  Captured the same demo/5-second playhead/view/settings before and after. Large
  coherent window distortions are visibly reduced and fine surface ripples are
  apparent. Evidence: `water-scale-before.png` and `water-scale-after.png`.
- Played, paused, sought 5 → 20 → 5 seconds, and exported from the paused 5-second
  playhead. After export the browser restored 5 seconds and enabled controls.
  Browser console returned no warnings/errors on the final version.
- Actual final film `/Users/paperneko/Downloads/Ring On Your Way-soundcanvas (8).webm`:
  VP9 1280×720, nominal 30 fps, 451 decoded frames, WebM duration 15.00 seconds
  (decoded stream endpoint ~15.03 s); Opus stereo 48 kHz, mean volume −11.6 dB.
  Inspected `water-scale-film-frame.png` from the encoded video: corrected fine
  ripples and stable room reflections appear in the actual recording.
- Focused independent review found no important issue in world units, slope
  reconstruction, shared detail gradients/time, checkpoint dimensions, Uint16
  mesh bounds (53,793 vertices) or GL cleanup.

Limits: still an artistic heightfield model with constant main-wave speed plus
analytic fine waves, not a full dispersive fluid solver. This check establishes
corrected scale/math and visible improvement in this browser; it does not claim
that every aspect is photographically indistinguishable from a real pool.


## One Quiet Drop — 2026-11-02

Approved scope: one white porcelain sphere, one strong musical onset, fall lead-in,
water contact at the onset, sinking and real local wave displacement, with a pure
water toggle. No repeated throws, Bunny-in-water or new sound effects.

- `src/pool-drop.js` selects one isolated onset from the existing offline features,
  ignores absent/weak onsets and reserves lead-in/settling time. Selection is cached
  per immutable analysis result. The demo chooses **35.86 seconds**.
- Sphere trajectory is evaluated directly from time: 0.7-second gravity fall,
  water-drag sinking, and resting on the floor. Fixed 1/120-second old/new body
  states drive world-space submerged-column displacement in the water solver.
  `poolDrop` is included in simulation checkpoint identity.
- The shared room tracer includes the sphere in direct, reflected and refracted
  views, with porcelain shading and shadows. Caustic shading uses the same ball
  state. The sphere remains on the floor; this one-event version cannot accumulate
  multiple objects.
- New pool-only row provides One quiet drop / Pure water, exact selected time,
  Preview drop and Cancel preparation. One event marker is drawn on the waveform.
  Preview frames the pool-edge view and waits for water reconstruction before
  starting audio; cancellation restores the previous view/time/play state.

Verification on `index.html?v=one-drop-3`:

- **43 tests pass**, including accent/no-accent selection, contact time, sinking,
  floor bounds, deterministic replay, toggle/file compatibility, deferred preview
  preparation (no early audio) and cancellation of never-completing preparation.
- Browser demo: inspected airborne sphere at 35.6, contact near 35.86, submerged
  sphere at 36.15 and resting sphere afterward. Preview visibly pauses at the
  lead-in while preparing, then starts playback. Pure water removes the sphere
  and its historical wave contribution; re-enabling restores the event.
- Cancelled a cold preview during reconstruction: audio remained paused and the
  prior 00:00 playhead returned, overlay closed and controls were enabled.
- Switched pool → Bunny → pool: event controls hide in Bunny and return in Pool.
  Checked the event row at 390×844 and reset the viewport override afterward.
- Real export begins at 34.91 and covers the drop:
  `/Users/paperneko/Downloads/Ring On Your Way-soundcanvas (9).webm`.
  VP9 1280×720, nominal 30 fps, 451 decoded frames, duration metadata 15.00 seconds
  (decoded stream end ~15.03 seconds), Opus stereo 48 kHz, mean level −10.1 dB.
  Visually inspected extracted frames at 0.6, 1.03 and 3 seconds: sphere in air,
  partially submerged, then below the surface. Playback returned paused to 34.91.
- Browser console returned no warnings/errors. Independent review found preview
  previously started audio before reconstruction; this was corrected, covered by
  regression tests, and re-reviewed with no remaining important issue reported.
- Evidence: `soundcanvas-one-drop.png` (UI) and `drop-air.png`, `drop-contact.png`,
  `drop-sunk.png` (actual encoded video frames) in the visualization output folder.

Limits: onset selection is an energy-change heuristic, not semantic accent or
beat understanding. Sphere motion and water coupling are an artistic approximation;
there is no full rigid-body/fluid simulation, detached splash droplets or guaranteed
sample-exact browser recording. Contact is aligned to the simulation/audio timeline
within its fixed-step/display resolution. User controls observed for QA (Impact 54,
Resonance 38, Growth 30) were preserved.
