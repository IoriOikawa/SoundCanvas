function Groove(duration) {
    this.name = "Groove";
    this.camera = new Camera2D();

    // Wooden texture for the base.
    loadImage('assets/Cherry.jpg', (img) => {
        this.img = img;
    });

    // To specify how many points per second.
    this.scalingFactor = 30;

    // To store history wave points to create a groove.
    this.history = undefined;

    // The last valid currentTime and duration.
    this.currentTime = undefined;
    this.duration = undefined;

    // The latest offset of groove.
    this.value = 0;

    // Put data into the history array.
    this.update = function(isPlaying, currentTime, duration) {
        // Initialize the history array.
        if (!this.history && duration) {
            this.history = [];
            this.history.length = Math.ceil(duration * this.scalingFactor);
            this.duration = duration;
        }

        // Compute currentTime.
        if (currentTime) {
            this.currentTime = currentTime;
        }

        // Index into the history array.
        let id = Math.floor(this.currentTime * this.scalingFactor);
        if (id < 0) {
            id = 0;
        }
        if (this.history && id >= this.history.length) {
            id = this.history.length - 1;
        }

        // Obtain waveform and add to the history.
        const wave = fourier.waveform();
        if (isPlaying) {
            this.history[id] = this.value = wave[0];
        }
    };

    this.draw = function() {
        push();
        this.camera.draw();

        // Radius of the disc.
        const R = height / 2;

        push();
        noStroke();
        // Background image.
        texture(this.img);
        translate(width / 2, height / 2, -0.1);
        plane(width, height);
        // Disc.
        fill(25);
        ellipse(0, 0, 2 * R, 2 * R, 50);
        fill(245, 180, 83);
        ellipse(0, 0, 0.5 * R, 0.5 * R, 50);
        pop();

        // Groove.
        push();
        noFill();
        stroke(255, 0, 0);
        strokeWeight(5);
        translate(width / 2, height / 2, 0);
        // Whether there is a shape ongoing.
        let status = false;
        // For each element of the groove,
        // map it to screen coordinates and make a new vertex.
        for (var i = 0; i < this.history.length; i++) {
            // Check if data has been set.
            if (this.history[i] === undefined) {
                if (status) {
                    endShape();
                    status = false;
                }
                continue;
            }
            if (!status) {
                beginShape();
                status = true;
            }
            // Polar coordinates.
            let theta = -PI / 4 + (i - this.currentTime * this.scalingFactor) * PI / 180;
            let r = map(i, 0, this.history.length - 1, 0.9 * R, 0.3 * R) + this.history[i] * 20;
            // Cartesian coordinates.
            let x = r * Math.cos(theta);
            let y = -r * Math.sin(theta);
            vertex(x, y, 0);
        }
        if (status) {
            endShape();
            status = false;
        }
        pop();

        // Position of the needle & pickup.
        let d = map(this.currentTime, 0, this.duration, 0.9 * R, 0.3 * R);
        if (isNaN(d)) {
            d = 0.95 * R;
        }

        // Needle.
        push();
        translate(width / 2, height / 2, 0.59);
        rotateZ(-PI / 4);
        translate(0, d + this.value * 20, 0);
        rotateZ(PI / 2);
        noStroke();
        fill(196, 202, 206);
        rect(-15, -0.5 * d, 30, 0.5 * d);
        stroke(0, 0, 0);
        fill(0xe3, 0xd3, 0x43);
        rect(-35, -60, 70, 120);
        noStroke();
        pop();

        // Pickup.
        push();
        translate(width / 2, height / 2, 0.6);
        noStroke();
        fill(192, 192, 192);
        rect(d, -R, 50, R + 0.4 * d);
        pop();

        pop();
    };
}
