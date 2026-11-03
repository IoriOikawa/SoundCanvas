import {
  createWaterEngine,
  loadWaterImages,
} from "./water-engine.js?v=duck-toggle-1";
export class CausticsRenderer {
  constructor(
    canvas,
    {
      onError = () => {},
      loadImages = loadWaterImages,
      createEngine = createWaterEngine,
    } = {},
  ) {
    this.canvas = canvas;
    this.pending = true;
    this.disposed = false;
    this.lost = (event) => {
      event.preventDefault();
      this.failed = true;
      onError(
        new Error(
          "The graphics connection was interrupted. Reload to continue.",
        ),
      );
    };
    canvas.addEventListener("webglcontextlost", this.lost);
    this.ready = loadImages()
      .then((images) => {
        if (this.disposed) return;
        this.engine = createEngine(canvas, images);
        this.pending = false;
      })
      .catch((error) => {
        this.failed = true;
        this.pending = false;
        if (!this.disposed) onError(error);
        throw error;
      });
    // The UI reports errors through onError; export also awaits the rejection.
    this.ready.catch(() => {});
  }
  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
  async prepare(analysis, time, settings, signal) {
    await this.ready;
    if (!this.disposed)
      await this.engine?.prepare(analysis, time, settings, signal);
  }
  render(analysis, time, settings) {
    if (!this.failed && !this.disposed)
      this.settling = this.engine
        ? !this.engine.render(analysis, time, settings)
        : true;
  }
  dispose() {
    this.disposed = true;
    this.engine?.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.lost);
  }
}
