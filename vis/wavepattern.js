function WavePattern() {
	//vis name
	this.name = "Wave Pattern";
    
    this.camera = new Camera2D();
    
    this.filter = new ArrayFilter(1024);
    
	// Draw the wave form to the screen.
	this.draw = function() {
		push();
        this.camera.draw();
        
		noFill();
		stroke(255, 0, 0);
		strokeWeight(2);

		// Calculate the waveform from the fft with different 'sensitivities'.
		let wave = fourier.waveform();
        const res = this.filter.update(wave);
        
        this.drawLine(wave, '#f00');
        this.drawLine(res.max64, '#200');
        this.drawLine(res.min64, '#200');
        this.drawLine(res.max16, '#400');
        this.drawLine(res.min16, '#400');
        this.drawLine(res.max4, '#800');
        this.drawLine(res.min4, '#800');
        this.drawLine(res.slow, '#f80');
        this.drawLine(res.medium, '#f08');
        this.drawLine(res.fast, '#f66');
        
		pop();
	};
    
    this.drawLine = function(line, color) {
        stroke(color);
		beginShape();
		for (let i = 0; i < line.length; i++) {
			let x = map(i, 0, line.length, 0, width);
			let y = map(line[i], -1, 1, 0, height);
			vertex(x, y);
		}
		endShape();
    };
}