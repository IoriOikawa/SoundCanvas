function Spectrum() {
    this.name = "Retro Spectrum";

    this.camera = new Camera2D();
    
    // Filter for (small) FFT result, which has 256 points.
    this.filter = new ArrayFilter(256);

    this.draw = function() {
        this.camera.draw();
        push();
        background('#2e2836');

        const spectrum = smallfourier.analyze();
        noStroke();

        const res = this.filter.update(spectrum);

        for (let i = 0; i < spectrum.length; i++) {

            // Fade the colour of the bin from #7785ac to #9ac6c5.
            let hue = map(res.medium[i], 0, 200, 0, 255);
            if (hue > 255) {
                hue = 255;
            }
            fill(
                map(hue, 0, 255, 0x77, 0x9a),
                map(hue, 0, 255, 0x85, 0xc6),
                map(hue, 0, 255, 0xac, 0xc5),
            );

            // Spectrum and Layers:
            // Draw each bin as a rectangle from the left of the screen
            // across.
            const y = map(i, 0, spectrum.length, 0, height);
            // Foreground spectrum.
            let w = map(spectrum[i], 0, 255, 0, width);
            rect(0, y, w, height / spectrum.length);

            // Intermediate layer with Max4 FFT.
            push();
            translate(0, 0, -0.01);
            fill('#be8a60');
            let mw = map(res.max4[i], 0, 255, 0, width);
            rect(0, y, mw, height / spectrum.length);
            pop();
            // Background layer with Max16 FFT.
            push();
            translate(0, 0, -0.02);
            fill('#6a2e35');
            let mmw = map(res.max16[i], 0, 255, 0, width);
            rect(0, y, mmw, height / spectrum.length);
            pop();
        }
        pop();
    };
}