function Needles() {
    this.name = "Needles";
    this.camera = new Camera2D();

    // How large is the arc of the needle plot.
    const minAngle = PI + PI / 10;
    const maxAngle = TWO_PI - PI / 10;

    this.plotsAcross = 2;
    this.plotsDown = 2;

    // Frquencies used by the energyfunction to retrieve a value
    // for each plot.
    this.frequencyBins = ["bass", "lowMid", "highMid", "treble"];

    this.textrenders = [new TextRenderer("bass"), new TextRenderer("loMid"),
        new TextRenderer("highMid"), new TextRenderer("treble")
    ];
    this.textrenders.forEach((tr) => {
        tr.background = '#f0f2d2';
        tr.foreground = '#000000';
    });
    this.filters = [new Filter(), new Filter(), new Filter(), new Filter()];

    // Resize the plots sizes when the screen is resized.
    this.onResize = function() {
        this.pad = width / 20;
        this.plotWidth = (width - this.pad) / this.plotsAcross;
        this.plotHeight = (height - this.pad) / this.plotsDown;
        this.dialRadius = (this.plotWidth - this.pad) / 2 - 5;
        this.textrenders.forEach((tr) => {
            tr.width = this.plotWidth - this.pad;
            tr.height = this.plotHeight - this.pad;
        });
    };
    // Call onResize to set initial values when the object is created
    this.onResize();

    // Draw the plots to the screen
    this.draw = function() {
        this.camera.draw();

        // Create an array amplitude values from the FFT.
        const spectrum = fourier.analyze();
        // Iterator for selecting frequency bin.
        let currentBin = 0;
        push();

        // Drawing each display piece.
        for (let i = 0; i < this.plotsDown; i++) {
            for (let j = 0; j < this.plotsAcross; j++) {

                // Calculate the size of the plots.
                let x = this.pad + j * this.plotWidth;
                let y = this.pad + i * this.plotHeight;
                let w = this.plotWidth - this.pad;
                let h = this.plotHeight - this.pad;

                // Draw a rectangle at that location and size.
                push();
                translate(x, y, -0.01);
                this.textrenders[currentBin].draw();
                pop();
                // Add on the ticks.
                this.ticks(x + w / 2, y + h);

                const energy = fourier.getEnergy(this.frequencyBins[currentBin]);
                const res = this.filters[currentBin].update(energy);

                // Add the needles.
                this.needle(energy, x + w / 2, y + h, 8, 1, '#333333');
                this.needle(res.max64, x + w / 2, y + h, 1, 1, '#333333');
                this.needle(res.max16, x + w / 2, y + h, 2, 1, '#333333');
                this.needle(res.max4, x + w / 2, y + h, 4, 1, '#333333');
                this.needle(res.slow, x + w / 2, y + h, 2, 0.7, '#377');
                this.needle(res.medium, x + w / 2, y + h, 2, 0.8, '#737');
                this.needle(res.fast, x + w / 2, y + h, 2, 0.9, '#773');
                currentBin++;
            }
        }

        noStroke();
        pop();
    };

    /*
     *draws a needle to an individual plot
     *@param energy: The energy for the current frequency
     *@param centreX: central x coordinate of the plot rectangle
     *@param bottomY: The bottom y coordinate of the plot rectangle
     */
    this.needle = function(energy, centreX, bottomY, thickness, length, color) {
        if (energy < -32) {
            energy = -32;
        }
        push();
        strokeWeight(thickness);
        stroke(color);
        // Translate so 0 is at the bottom of the needle.
        translate(centreX, bottomY);
        // Map the energy to the angle for the plot.
        theta = map(energy, 0, 255, minAngle, maxAngle);
        // Calculate x and y coorindates from angle for the length of needle.
        const x = this.dialRadius * cos(theta) * length;
        const y = this.dialRadius * sin(theta) * length;
        // Draw the needle.
        line(0, 0, x, y);
        pop();
    };

    /*
     *draw the graph ticks on an indivisual plot
     *@param centreX: central x coordinate of the plot rectangle
     *@param bottomY: The bottom y coordinate of the plot rectangle
     */
    this.ticks = function(centreX, bottomY) {
        // 8 ticks from pi to 2pi
        let nextTickAngle = minAngle;
        push();
        stroke('#333333');
        fill('#333333');
        translate(centreX, bottomY);
        
        // Draw the semi circle for the botttom of the needle.
        push();
        translate(0, 0, 0.3);
        arc(0, 0, 20, 20, PI, 2 * PI);
        pop();

        for (let i = 0; i < 9; i++) {
            // For each tick work out the start and end coordinates of
            // based on its angle from the needle's origin.
            let x = this.dialRadius * cos(nextTickAngle);
            let x1 = (this.dialRadius - 5) * cos(nextTickAngle);

            let y = (this.dialRadius) * sin(nextTickAngle);
            let y1 = (this.dialRadius - 5) * sin(nextTickAngle);

            line(x, y, x1, y1);
            nextTickAngle += PI / 10;
        }
        pop();
    };

}