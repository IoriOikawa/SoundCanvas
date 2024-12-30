function DancingEarth() {
    this.name = "Dancing Earth";
    this.camera = new Camera3D();

    // Boundary points of the continents on the globe.
    this.data = loadJSON("assets/points.json");

    this.draw = function() {
        push();
        this.camera.draw();

        // Radius of the globe.
        const r = min(width, height) / 2.9 * 2;

        // Move the globe back to not to hide the menu.
        translate(0, +1.3 * tan(PI * 30.0 / 180.0) * r, -1.3 * r);

        // Rotation of the globe, with a constant speed.
        rotateZ(0.4);
        rotateX(-0.3);
        rotateY(millis() / 10000);

        // Style of the globe.
        ambientMaterial(70, 130, 230, 127);
        stroke('#7070c0');
        sphere(r);
        noStroke();

        // The cylinders.
        const spectrum = fourier.analyze();
        for (let i = 0; i < this.data.v.length; i++) {
            const maxHeight = 0.5 * r;
            const index = Math.floor(i * Math.sqrt(2)) % spectrum.length;
            const height = maxHeight * spectrum[index] / 255;

            push();

            // Rotations according to latitude and longitute.
            rotateY(this.data.v[i][0] / 180 * PI);
            rotateZ(-this.data.v[i][1] / 180 * PI + PI / 2);

            // Style of the cylinder.
            normalMaterial(0);
            translate(0, -r - height / 2, 0);
            box(0.05 * r, height, 0.05 * r);

            pop();
        }

        pop();
    }
}