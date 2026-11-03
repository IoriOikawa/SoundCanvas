# Pool Light scene

User-approved scope: add sunlit pool-floor caustics as a selectable scene, retain the bunny, use the existing visual music controls and film export, and leave audio playback unchanged. Underwater viewpoints and acoustic effects are future work.

- [x] Test deterministic, bounded visual feature mapping and scene/settings compatibility.
- [x] Implement a full-canvas procedural caustic renderer with slowly moving refractive-looking light networks, a quiet floor texture, pan interaction and musical modulation. This is an artistic approximation rather than a physically simulated water volume.
- [x] Add a shared scene-renderer factory so preview and exported film use the same scene.
- [x] Add a scene selector; update scene-specific text and controls; persist selection, separate pool pan from bunny camera, and lock switching while recording.
- [x] Browser-check both scenes, the pool's three controls, pan/reset, settings, and an actual audible pool film. Run all tests and review changes.
- [x] Record the future underwater listening/viewpoint direction without implementing audio processing in this change.


## Correction after visual feedback

The procedural light network passed functional checks but did not reproduce water.
User explicitly requested Evan Wallace's WebGL Water and its Flickr tile reference.

- [x] Replace the procedural shader with the original MIT heightfield and optical renderer; retain source headers and local asset credits.
- [x] Isolate GL instances for preview/film, await local textures, clean up resources and late async initialization.
- [x] Seed disturbances and drive local ripples from fixed audio-time steps; retain checkpoints for seeking.
- [x] Verify actual browser water appearance, scene switching, seeking and an audible exported film; review the integration.
- [x] Update verification evidence and disclose the source of the visual engine.
