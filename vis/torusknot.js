function TorusKnot() {
    this.name = "Torus Knot";
    this.camera = new Camera3D();

    // Filter for the waveform, which has 1024 points.
    this.filter = new ArrayFilter(1024);

    this.draw = function() {
        push();
        this.camera.draw();

        // Major radius of the torus.
        const R = 600;
        // Minor radius of the torus.
        const r = 350;
        // Parameters of the knot. GCD(p, q) must be 1.
        const p = 3;
        const q = 5;

        // Move everything back to not to hide the menu.
        translate(0, +1.3 * tan(PI * 30.0 / 180.0) * R, -1.3 * R);

        // Rotation of the knot, with a constant speed.
        rotateX(millis() / 12000);
        rotateY(millis() / 10000);

        // Calculate the waveform.
        const wave = fourier.waveform();
        const res = this.filter.update(wave);

        stroke(0);
        // The knot. Formula obtained from Mathematica.
        this.loftTube({
            steps: 256,
            div: 8,
            fcolour: (i) => {
                const iid = Math.round(map(i, 0, 256, 0, wave.length - 1));
                const hue = (map(i, 0, 256, 0, 360) + millis() / 10) % 360;
                const sat = map(res.max16[iid], 0, 1, 0, 1);
                const val = 1;
                return this.hsv2rgb(hue, sat, val);
            },
            fv: (t) => [
                (R + r * Math.cos(q * t)) * Math.cos(p * t), (R + r * Math.cos(q * t)) * Math.sin(p * t), -r * Math.sin(q * t),
            ],
            fd: (t) => [-((Math.sqrt(2) * (p * (R + r * Math.cos(q * t)) * Math.sin(p * t) + q * r * Math.cos(p * t) * Math.sin(q * t))) /
                    Math.sqrt(2 * (q * q) * (r * r) + (p * p) * ((r * r) + 2 * (R * R)) +
                        (p * p) * r * (4 * R * Math.cos(q * t) + r * Math.cos(2 * q * t)))), (Math.sqrt(2) * (p * Math.cos(p * t) * (R + r * Math.cos(q * t)) - q * r * Math.sin(p * t) * Math.sin(q * t))) /
                Math.sqrt(2 * (q * q) * (r * r) + (p * p) * ((r * r) + 2 * (R * R)) +
                    (p * p) * r * (4 * R * Math.cos(q * t) + r * Math.cos(2 * q * t))), -((Math.sqrt(2) * q * r * Math.cos(q * t)) /
                    Math.sqrt(2 * (q * q) * (r * r) + (p * p) * ((r * r) + 2 * (R * R)) +
                        (p * p) * r * (4 * R * Math.cos(q * t) + r * Math.cos(2 * q * t)))),
            ],
            fn: (t) => [
                (-4 * (p * p) * q * r * (R + r * Math.cos(q * t)) * Math.sin(q * t) *
                    (p * (R + r * Math.cos(q * t)) * Math.sin(p * t) + q * r * Math.cos(p * t) * Math.sin(q * t)) -
                    2 * ((p * p) * (r * r) + 2 * (q * q) * (r * r) + 2 * (p * p) * (R * R) +
                        4 * (p * p) * r * R * Math.cos(q * t) + (p * p) * (r * r) * Math.cos(2 * q * t)) *
                    (Math.cos(p * t) * ((p * p) * R + ((p * p) + (q * q)) * r * Math.cos(q * t)) -
                        2 * p * q * r * Math.sin(p * t) * Math.sin(q * t))) /
                (Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) + 2 * (p * p) * (R * R) +
                        4 * (p * p) * r * R * Math.cos(q * t) + (p * p) * (r * r) * Math.cos(2 * q * t), 1.5) *
                    Math.sqrt((3 * Math.pow(p, 6) * Math.pow(r, 4) + 13 * Math.pow(p, 4) * (q * q) * Math.pow(r, 4) +
                            28 * (p * p) * Math.pow(q, 4) * Math.pow(r, 4) + 8 * Math.pow(q, 6) * Math.pow(r, 4) +
                            24 * Math.pow(p, 6) * (r * r) * (R * R) +
                            44 * Math.pow(p, 4) * (q * q) * (r * r) * (R * R) +
                            8 * (p * p) * Math.pow(q, 4) * (r * r) * (R * R) + 8 * Math.pow(p, 6) * Math.pow(R, 4) +
                            8 * (p * p) * r * R * (4 * Math.pow(q, 4) * (r * r) +
                                2 * (p * p) * (q * q) * (4 * (r * r) + (R * R)) +
                                Math.pow(p, 4) * (3 * (r * r) + 4 * (R * R))) * Math.cos(q * t) +
                            4 * (p * p) * (r * r) * (-(Math.pow(q, 4) * (r * r)) +
                                3 * (p * p) * (q * q) * ((r * r) + (R * R)) +
                                Math.pow(p, 4) * ((r * r) + 6 * (R * R))) * Math.cos(2 * q * t) +
                            8 * Math.pow(p, 6) * Math.pow(r, 3) * R * Math.cos(3 * q * t) + Math.pow(p, 6) * Math.pow(r, 4) * Math.cos(4 * q * t) -
                            Math.pow(p, 4) * (q * q) * Math.pow(r, 4) * Math.cos(4 * q * t)) /
                        Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) +
                            2 * (p * p) * (R * R) + 4 * (p * p) * r * R * Math.cos(q * t) +
                            (p * p) * (r * r) * Math.cos(2 * q * t), 2))), (2 * ((p * p) * (r * r) + 2 * (q * q) * (r * r) + 2 * (p * p) * (R * R) +
                        4 * (p * p) * r * R * Math.cos(q * t) + (p * p) * (r * r) * Math.cos(2 * q * t)) *
                    (-(((p * p) * R + ((p * p) + (q * q)) * r * Math.cos(q * t)) * Math.sin(p * t)) -
                        2 * p * q * r * Math.cos(p * t) * Math.sin(q * t)) +
                    4 * (p * p) * q * r * (R + r * Math.cos(q * t)) * Math.sin(q * t) *
                    (p * Math.cos(p * t) * (R + r * Math.cos(q * t)) - q * r * Math.sin(p * t) * Math.sin(q * t))) /
                (Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) + 2 * (p * p) * (R * R) +
                        4 * (p * p) * r * R * Math.cos(q * t) + (p * p) * (r * r) * Math.cos(2 * q * t), 1.5) *
                    Math.sqrt((3 * Math.pow(p, 6) * Math.pow(r, 4) + 13 * Math.pow(p, 4) * (q * q) * Math.pow(r, 4) +
                            28 * (p * p) * Math.pow(q, 4) * Math.pow(r, 4) + 8 * Math.pow(q, 6) * Math.pow(r, 4) +
                            24 * Math.pow(p, 6) * (r * r) * (R * R) +
                            44 * Math.pow(p, 4) * (q * q) * (r * r) * (R * R) +
                            8 * (p * p) * Math.pow(q, 4) * (r * r) * (R * R) + 8 * Math.pow(p, 6) * Math.pow(R, 4) +
                            8 * (p * p) * r * R * (4 * Math.pow(q, 4) * (r * r) +
                                2 * (p * p) * (q * q) * (4 * (r * r) + (R * R)) +
                                Math.pow(p, 4) * (3 * (r * r) + 4 * (R * R))) * Math.cos(q * t) +
                            4 * (p * p) * (r * r) * (-(Math.pow(q, 4) * (r * r)) +
                                3 * (p * p) * (q * q) * ((r * r) + (R * R)) +
                                Math.pow(p, 4) * ((r * r) + 6 * (R * R))) * Math.cos(2 * q * t) +
                            8 * Math.pow(p, 6) * Math.pow(r, 3) * R * Math.cos(3 * q * t) + Math.pow(p, 6) * Math.pow(r, 4) * Math.cos(4 * q * t) -
                            Math.pow(p, 4) * (q * q) * Math.pow(r, 4) * Math.cos(4 * q * t)) /
                        Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) +
                            2 * (p * p) * (R * R) + 4 * (p * p) * r * R * Math.cos(q * t) +
                            (p * p) * (r * r) * Math.cos(2 * q * t), 2))), (4 * (q * q) * r * ((q * q) * (r * r) + (p * p) * (R * R) +
                    (p * p) * r * R * Math.cos(q * t)) * Math.sin(q * t)) /
                (Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) + 2 * (p * p) * (R * R) +
                        4 * (p * p) * r * R * Math.cos(q * t) + (p * p) * (r * r) * Math.cos(2 * q * t), 1.5) *
                    Math.sqrt((3 * Math.pow(p, 6) * Math.pow(r, 4) + 13 * Math.pow(p, 4) * (q * q) * Math.pow(r, 4) +
                            28 * (p * p) * Math.pow(q, 4) * Math.pow(r, 4) + 8 * Math.pow(q, 6) * Math.pow(r, 4) +
                            24 * Math.pow(p, 6) * (r * r) * (R * R) +
                            44 * Math.pow(p, 4) * (q * q) * (r * r) * (R * R) +
                            8 * (p * p) * Math.pow(q, 4) * (r * r) * (R * R) + 8 * Math.pow(p, 6) * Math.pow(R, 4) +
                            8 * (p * p) * r * R * (4 * Math.pow(q, 4) * (r * r) +
                                2 * (p * p) * (q * q) * (4 * (r * r) + (R * R)) +
                                Math.pow(p, 4) * (3 * (r * r) + 4 * (R * R))) * Math.cos(q * t) +
                            4 * (p * p) * (r * r) * (-(Math.pow(q, 4) * (r * r)) +
                                3 * (p * p) * (q * q) * ((r * r) + (R * R)) +
                                Math.pow(p, 4) * ((r * r) + 6 * (R * R))) * Math.cos(2 * q * t) +
                            8 * Math.pow(p, 6) * Math.pow(r, 3) * R * Math.cos(3 * q * t) + Math.pow(p, 6) * Math.pow(r, 4) * Math.cos(4 * q * t) -
                            Math.pow(p, 4) * (q * q) * Math.pow(r, 4) * Math.cos(4 * q * t)) /
                        Math.pow((p * p) * (r * r) + 2 * (q * q) * (r * r) +
                            2 * (p * p) * (R * R) + 4 * (p * p) * r * R * Math.cos(q * t) +
                            (p * p) * (r * r) * Math.cos(2 * q * t), 2))),
            ],
            fthick: (v) => {
                const id = Math.round(map(v, 0, 256, 0, wave.length - 1));
                return map(res.max4[id], 0, 1, 50, 120);
            },
            dphi: - millis() / 10000 * PI,
        });

        // The inner ring.
        this.loftTube({
            steps: 32,
            div: 8,
            fcolour: (i) => {
                const iid = Math.round(map(i, 0, 32, 0, wave.length - 1));
                const hue = 360 - (map(i, 0, 32, 360, 0) + millis() / 10) % 360;
                const sat = map(res.fast[iid], 0, 1, 0, 1);
                const val = map(res.max16[iid], 0, 1, 1, 0);
                return this.hsv2rgb(hue, sat, val);
            },
            fv: (t) => [
                R * Math.cos(t),
                R * Math.sin(t),
                0,
            ],
            fd: (t) => [-Math.sin(t),
                Math.cos(t),
                0,
            ],
            fn: (t) => [
                Math.cos(t),
                Math.sin(t),
                0,
            ],
            fthick: (t) => 50,
            dphi: millis() / 3000 * PI
        });

        pop();
    };

    // Colouring algorithm referenced from:
    // https://www.rapidtables.com/convert/color/hsv-to-rgb.html
    this.hsv2rgb = function(H, S, V) {
        if (S > 1) S = 1;
        if (S < 0) S = 0;
        if (V > 1) V = 1;
        if (V < 0) V = 0;
        const C = V * S;
        const X = C * (1 - Math.abs((H / 60) % 2 - 1));
        const m = V - C;
        let res;
        if (H < 60) {
            res = [C, X, 0];
        } else if (H < 120) {
            res = [X, C, 0];
        } else if (H < 180) {
            res = [0, C, X];
        } else if (H < 240) {
            res = [0, X, C];
        } else if (H < 320) {
            res = [X, 0, C];
        } else {
            res = [C, 0, X];
        }
        return res.map((v) => (v + m) * 255);
    };

    // Universal algorithm for 3D lofting a circle along a path.
    // The path is specified by fv (location vector), fd (tangent vector), and fn (normal vector).
    // They are invoked with a single parameter t from 0 to 2*Pi.
    // The path is divided into many steps, each of which is coloured using fcolour.
    // The circle has a radius determined by fthick.
    // The circle has div segments and is twisted according to dphi.
    this.loftTube = function({
        steps, div, fcolour, fv, fd, fn, fthick, dphi,
    }) {
        for (let i = 0; i < steps; i++) {
            emissiveMaterial(fcolour(i));
            
            // We need to alternate between the current circle and the next circle,
            // so j is doubled; and we need div + 1 to close-up the ring.
            beginShape(TRIANGLE_STRIP);
            for (let j = 0; j < 2 * (div + 1); j++) {
                // Effective index, alternating between the current and the next.
                const ii = j % 2 ? (i === steps - 1 ? 0 : i + 1) : i;
                // Curve parameter of the path.
                const t = ii / steps * 2 * PI;
                // Location vector.
                const [x, y, z] = fv(t);
                // Unit tangent vector.
                const [dx, dy, dz] = fd(t);
                // Unit normal vector.
                const [nx, ny, nz] = fn(t);
                // Unit binormal vector.
                const mx = dy * nz - dz * ny;
                const my = dz * nx - dx * nz;
                const mz = dx * ny - dy * nx;
                // Local rotation.
                const phi = Math.floor(j / 2) / div * 2 * PI + dphi;
                // Radius.
                const thick = fthick(ii + Math.floor(j / 2) / div);
                // Offset from the torus.
                const ox = thick * (nx * Math.cos(phi) + mx * Math.sin(phi));
                const oy = thick * (ny * Math.cos(phi) + my * Math.sin(phi));
                const oz = thick * (nz * Math.cos(phi) + mz * Math.sin(phi));
                // Plot.
                vertex(x + ox, -(z + oz), y + oy);
            }
            endShape(CLOSE);
        }
    };
}
