# One Quiet Drop Implementation Plan

**Approved goal:** One white porcelain sphere falls ahead of a single strong musical onset, touches the water on the onset, sinks, and drives actual spreading waves. Keep a pure-water toggle. No automatic repeated throws, Bunny or new sound effects.

**Approach:** Derive one immutable event from the offline audio features. Evaluate the sphere trajectory from audio time, including during seeking/export. Couple its changing submerged volume to the existing world-space heightfield at fixed simulation steps. Intersect the sphere in the shared room ray tracer, so direct views, reflections and refractions agree. Show an event marker and an action to preview its short lead-in.

- [x] Test onset selection (silence excluded, isolated peak, enough lead-in), deterministic contact/sinking trajectory, submerged volume and toggle/settings compatibility; observe failures before implementation.
- [x] Add `src/pool-drop.js` with one-event selection, trajectory, sphere uniforms and submerged-volume helpers. Add fixed-step physical water coupling and include the toggle in checkpoint identity.
- [x] Render porcelain sphere and its shadows in room/reflection/refraction and caustics using the same audio-time state.
- [x] Add pool-only toggle, event timing/preview control and waveform marker. Preserve busy locks and existing music/camera controls. Bump browser module versions.
- [x] Browser-check lead-in/contact/submersion, off/on, no-accent music, seek/replay, Bunny switching and actual export. Review code, run tests and save evidence.

Work in the existing shared checkout; no commit, merge or dependency installation is required. Retain the corrected water proportions and fine waves.
