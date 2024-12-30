// Global for the controls and input.
let controls = null;
// Store visualisations in a container.
let vis = null;
// Variable for the p5 sound object.
let sound = null;
// Variable for p5 fast fourier transform.
let fourier, smallfourier;
// An instance of the Groove visualization.
// This is necessary as a workaround for letting it know the waveform when displaying another vis.
let groove;

function preload() {
    sound = loadSound('assets/Ring_On_Your_Way.flac');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    background(0);
    controls = new ControlsAndInput();

    // Instantiate the fft object.
    fourier = new p5.FFT(0.8, 1024);
    smallfourier = new p5.FFT(0.5, 256);

    // Create a new visualisation container and add visualisations.
    vis = new Visualisations();
    vis.add(new Spectrum());
    vis.add(new WavePattern());
    vis.add(new Needles());
    vis.add(new DancingEarth());
    vis.add(groove = new Groove());
    vis.add(new TorusKnot());
}

function draw() {
    background(0);
    // Update groove because it relies on constantly feed data.
    groove.update(sound.isPlaying(), sound.currentTime(), sound.duration());
    // Draw the selected visualisation.
    vis.selectedVisual.draw();
    // Draw the controls on top.
    controls.draw();
}

function mouseClicked() {
    controls.mousePressed();
}

function keyPressed() {
    controls.keyPressed(keyCode);
}

// When the window has been resized, Resize canvas to fit.
// If the visualisation needs to be resized call its onResize method.
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    controls.onResize();
    if (vis.selectedVisual.hasOwnProperty('onResize')) {
        vis.selectedVisual.onResize();
    }
}