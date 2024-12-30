// !!! Camera position need to be fixed !!!

// !!! Text should be enabled in WEBGL !!!
// https://github.com/processing/p5.js/issues/2183

//draw the waveform to the screen
function WavePattern() {
	//vis name
	this.name = "wavepattern";

	//draw the wave form to the screen
	this.draw = function() {
        // !!! Camera position need to be fixed !!!
        camera(width / 2, height / 2, (height/2.0) / tan(PI*30.0 / 180.0), width / 2, height / 2, 0, 0, 1, 0);
        
		push();
		noFill();
		stroke(255, 0, 0);
		strokeWeight(2);

		beginShape();
		//calculate the waveform from the fft.
		var wave = fourier.waveform();
		for (var i = 0; i < wave.length; i++) {
			//for each element of the waveform map it to screen
			//coordinates and make a new vertex at the point.
			var x = map(i, 0, wave.length, 0, width);
			var y = map(wave[i], -1, 1, 0, height);

			vertex(x, y);
		}

		endShape();
		pop();
	};
}