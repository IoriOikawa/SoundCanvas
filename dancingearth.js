function DancingEarth() {
    //vis name
    this.name = "dancingearth";

    this.data = loadJSON("assets/points.json");

    // createCanvas(windowWidth, windowHeight, WEBGL);

    //draw the wave form to the screen
    this.draw = function () {
        //		push();
        //		noFill();
        //		stroke(255, 0, 0);
        //		strokeWeight(2);
        //
        //		beginShape();
        //		//calculate the waveform from the fft.
        //		var wave = fourier.waveform();
        //		for (var i = 0; i < wave.length; i++) {
        //			//for each element of the waveform map it to screen
        //			//coordinates and make a new vertex at the point.
        //			var x = map(i, 0, wave.length, 0, width);
        //			var y = map(wave[i], -1, 1, 0, height);
        //
        //			vertex(x, y);
        //		}
        //
        //		endShape();
        //		pop();
        //	};
        push();
        // orbitControl();
        ortho(-width / 2, width / 2, -height / 2, height / 2);
        camera(0, -height / 2, (height / 2.0) / tan(PI * 30.0 / 180.0), 0, 0, 0, 0.3, 1, 0);
        
        let r = min(width, height) / 2.9;
        rotateY(millis() / 10000);
        ambientMaterial(70, 130, 230, 127);
        noStroke();
        sphere(r);
		var spectrum = fourier.analyze();
        for (let i = 0; i < this.data.v.length; i++) {
            let rr = 0.5 * r;
            let k = spectrum[Math.floor(i * Math.sqrt(2)) % 600] / 255;
            push();
            normalMaterial(0);
            rotateY(this.data.v[i][0] / 180 * PI);
            rotateZ(-this.data.v[i][1] / 180 * PI + PI / 2);
            translate(0, -r - rr * k / 2, 0);
            box(0.05 * r, rr * k, 0.05 * r);
            pop();
        }
        pop();

        // for(x = 0; x <= mouseX; x += 60){
        // 	for(y = 0; y <= mouseY; y += 60){
        //   	ellipse(x, y, 50, 50);
        //   }
        //   ellipse(x, y, 50, 50);
        // }
    }
}
