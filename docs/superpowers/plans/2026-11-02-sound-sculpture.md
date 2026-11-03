# Sound sculpture v1 implementation plan

**Goal:** Deliver the approved local-audio → adjustable sculpture → saved settings → audible short-film workflow.

**Architecture:** Static browser application with no build or server-side processing. Fixed-window audio features are computed in a worker. A pure time-indexed sculpture model feeds a WebGL renderer, so seeking and replaying use the same geometry. Web Audio controls playback; canvas capture and MediaRecorder export a real-time short film. The original p5 experience remains accessible.

**Stack:** ES modules, Web Audio, WebGL, Web Workers, MediaRecorder, Node's built-in test runner. No production dependencies.

## 1. Test the computational contract
- [x] Add `tests/core.test.mjs` using synthetic PCM, silence, impulses, and low/high-frequency tones.
- [x] Verify analysis returns finite values, distinguishes bands, responds to onsets, and samples consistently at boundaries.
- [x] Verify sculpture geometry is finite, deterministic at a given timestamp and changes with music/control settings.
- [x] Verify saved settings reject invalid versions/nonfinite values and export ranges clamp to the song.
- [x] Run `node --test tests/*.test.mjs` and observe failure before adding core modules.

## 2. Implement the model
- [x] `src/analysis.js`: mono fixed-rate windowed RMS, low/mid/high energy, onset envelope, normalization, and interpolation. Worker messages carry progress, errors and transferred typed arrays.
- [x] `src/model.js`: validated settings, clip boundaries, time formatting, deterministic history-driven shell geometry and surface normals. Geometry depends on track-relative time, not animation-frame history.
- [x] `src/analysis-worker.js`: worker adapter for analysis.
- [x] Repeat core tests; keep silence, seek boundaries and invalid settings explicit.

## 3. Implement the listening and visual surface
- [x] `src/audio.js`: decode local files/demo, AudioContext clock, play/pause/seek/end, and a recording destination. Stop and disconnect old sources on replacement.
- [x] `src/renderer.js`: indexed mesh, lit material, perspective camera and interactive orbit; report missing/lost graphics support.
- [x] `index.html`, `styles.css`, `src/app.js`: responsive studio, waveform seeking, three controls, project settings download/import, progress/error messages and keyboard support.
- [x] `classic.html`: preserve original entry point unchanged apart from a return link.

## 4. Complete the output loop
- [x] `src/export.js`: detect supported MIME type; record a dedicated 1280×720 canvas plus Web Audio stream for 15/30 seconds, clamped to remaining audio.
- [x] Cancel safely, revoke download URLs and clean tracks, restore prior transport/camera state, report errors and unsupported recording.
- [x] Disable conflicting controls during recording. Stop recording if the page is hidden to avoid silently delivering a throttled film.

## 5. Verify and document
- [x] Run all computational tests and syntax checks.
- [x] Serve locally and test default demo, playback, seeking, control changes, synthetic file import, settings roundtrip, invalid input, audible export and cancellation in a real browser.
- [x] Inspect desktop and mobile screenshots; check console errors.
- [x] Update README with run commands, known export limitations and verification evidence. Keep changes uncommitted for review.

Scope boundary: no claims of semantic song understanding, beat detection, offline frame-perfect encoding, MIDI, accounts, payment or cloud storage. These require later validation. The export is real-time and may drop frames under load; geometric state is deterministic regardless of preview frame rate.
