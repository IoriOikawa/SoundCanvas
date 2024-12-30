// A building block of an infinite impulse response filter impl.
function IIRFilterSection(b, a, k) {
    this.b = b;
    this.a = a;
    this.k = k;

    this.xs = [];
    this.xs.length = b.length;
    this.xs.fill(0);
    this.ys = [];
    this.ys.length = a.length - 1;
    this.ys.fill(0);
}

// Compute one output at a time. Only one number is allowed as input.
IIRFilterSection.prototype.update = function(x) {
    this.xs.splice(0, 1);
    this.xs.push(x);

    let y = 0;
    for (let i = 0; i < this.b.length; i++) {
        y += this.b[i] * this.xs[this.b.length - i - 1];
    }
    for (let i = 0; i < this.a.length - 1; i++) {
        y -= this.a[i + 1] * this.ys[this.a.length - i - 2];
    }
    y /= this.a[0];

    this.ys.splice(0, 1);
    this.ys.push(y);

    return y * this.k;
};


// An IIR filter as a whole.
function IIRFilter(coeffs) {
    this.sections = coeffs.map(([b, a, k]) => new IIRFilterSection(b, a, k));
}

// Compute one output at a time. Only one number is allowed as input.
IIRFilter.prototype.update = function(x) {
    return this.sections.reduce((value, section) => section.update(value), x);
};


// The mathematical part of afterimage effect.
// Combining three maximum filters and three IIR filters.
function Filter() {
    this.xs = [];
    this.xs.length = 64;
    this.xs.fill(0);

    // Coeffiecients are calculated from Matlab.
    this.iirSlow = new IIRFilter([
        [
            [1.000000000000000, -1.978484449880578, 1.000000000000000],
            [1.000000000000000, -1.963886826087365, 0.977301836638524],
            0.807053803753471,
        ],
        [
            [1.000000000000000, -1.908823462891352, 1.000000000000000],
            [1.000000000000000, -1.910262477660927, 0.915766286420637],
            0.616071584691819,
        ],
        [
            [1.000000000000000, -1.982741597157895, 1.000000000000000],
            [1.000000000000000, -1.980790388317973, 0.996544851112737],
            0.061586870370542,
        ],
    ]);
    this.iirMedium = new IIRFilter([
        [
            [1.000000000000000, -1.620371214074619, 1.000000000000000],
            [1.000000000000000, -1.808632536720182, 0.831833297575618],
            0.523196248596548,
        ],
        [
            [1.000000000000000, -1.901675535936272, 1.000000000000000],
            [1.000000000000000, -1.904338835877204, 0.961208703979641],
            0.060214225308840,
        ],
    ]);
    this.iirFast = new IIRFilter([
        [
            [1.000000000000000, -1.251361390129867, 1.000000000000000],
            [1.000000000000000, -1.615434268169853, 0.826451639696816],
            0.157721543809276,
        ],
        [
            [1.000000000000000, 1.000000000000000],
            [1.000000000000000, -0.758333574017618],
            0.215944074709191,
        ],
    ]);
}

// Compute multiple outputs of a single data point at a time.
// Only one number is allowed as input.
Filter.prototype.update = function (x) {
    this.xs.splice(0, 1);
    this.xs.push(x);
    return {
        max64: this.xs.reduceRight((maxValue, value) => Math.max(value, maxValue)),
        max16: this.xs.reduceRight((maxValue, value, index) =>
                                   index + 16 >= 64 ? Math.max(value, maxValue) : maxValue),
        max4: this.xs.reduceRight((maxValue, value, index) =>
                                   index + 4 >= 64 ? Math.max(value, maxValue) : maxValue),
        
        min64: this.xs.reduceRight((minValue, value) => Math.min(value, minValue)),
        min16: this.xs.reduceRight((minValue, value, index) =>
                                   index + 16 >= 64 ? Math.min(value, minValue) : minValue),
        min4: this.xs.reduceRight((minValue, value, index) =>
                                   index + 4 >= 64 ? Math.min(value, minValue) : minValue),
        slow: this.iirSlow.update(x),
        medium: this.iirMedium.update(x),
        fast: this.iirFast.update(x),
    };
};
