// !!! Should think how interactions can work under WebGL... !!! 

// !!! Text should be enabled in WEBGL !!!
// https://github.com/processing/p5.js/issues/2183

//draw the waveform to the screen
function Groove() {
    //vis name
    this.name = "groove";

    loadImage('assets/Cherry.jpg', (img) => {
        this.img = img;
    });

    this.history = [0, 0];

    // !!! Should think how this can work under WebGL... !!! 
    //    this.volumeKnob = createSlider(0, 255, 100);
    //    this.panKnob = createSlider(0, 255, 100);
    //    
    //draw the wave form to the screen
    this.draw = function (isPlaying) {
        // Camera position
        camera(width / 2, height / 2, (height / 2.0) / tan(PI * 30.0 / 180.0), width / 2, height / 2, 0, 0, 1, 0);

        let R = height / 2;
        const len = 4000;

        push();
        texture(this.img);
        translate(width / 2, height / 2, 0);
        plane(width, height);
        fill(25);
        ellipse(0, 0, 2 * R, 2 * R, 50);
        fill(245, 180, 83);
        ellipse(0, 0, 0.5 * R, 0.5 * R, 50);
        pop();

        //calculate the waveform from the fft.
        var wave = fourier.waveform();
        if (isPlaying)
            this.history.push(max(wave));
        if (this.history.length >= len) {
            this.history.splice(0, this.history.length - len);
        }

        push();
        fill(255, 0);
        stroke(255, 0, 0);
        strokeWeight(5);
        translate(width / 2, height / 2, 10);
        beginShape();
        for (var i = 0; i < this.history.length; i++) {
            //for each element of the groove map it to screen
            //coordinates and make a new vertex.
            let theta = -PI / 4 - i * PI / 180;
            let r = map(i, 0, len, 0.9 * R, 0.3 * R) + this.history[this.history.length - i - 1] * 10;
            let x = r * Math.cos(theta);
            let y = -r * Math.sin(theta);

            vertex(x, y);
        }
        endShape();
        pop();
        
        let d = map(0, 0, len, 0.9 * R, 0.3 * R);

        push();
        translate(width / 2, height / 2, 10);
        rotateZ(-PI / 4);
        translate(0, d + this.history[this.history.length - 1] * 10, 0);
        rotateZ(PI / 2);
        
        noStroke();
        fill(196, 202, 206);
        rect(-15, -0.5 * d, 30, 0.5 * d);
        
        stroke(0, 0, 0);
        fill(0xe3, 0xd3, 0x43);
        rect(-35, -60, 70, 120);

        //        }
        pop();
        
        push();
        translate(width / 2, height / 2, 10);
        noStroke();
        fill(192, 192, 192);
        rect(d, -R, 50, R + 0.4 * d);
        pop();
    };
}
