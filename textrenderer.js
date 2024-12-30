// Try rendering text in WEBGL:
// Reference: https://github.com/processing/p5.js/issues/2183

// Generator of texture showing certain text of certain size.
function TextRenderer(text) {
    this._texture = undefined; // Invalidated during initialization.
    this._width = 0;
    this._height = 0;
    this._background = '';
    this._foreground = '';
    this._text = text;
    Object.defineProperties(this, {
        texture: {
            // Create a new texture if not exist.
            get: function() {
                if (this._texture) return this._texture;

                this._texture = createGraphics(this._width, this._height, P2D);
                this._texture.background(this._background);
                this._texture.fill(this._foreground);
                this._texture.strokeWeight(2);
                this._texture.textSize(34);
                this._texture.textAlign(CENTER, CENTER);
                this._texture.text(this._text, this._width / 2, this._height / 2);

                return this._texture;
            },
        },
        width: {
            get: function() {
                return this._width;
            },
            set: function(v) {
                if (this._width !== v) {
                    this._width = v;
                    this._texture = undefined; // Invalidate.
                }
            },
        },
        height: {
            get: function() {
                return this._height;
            },
            set: function(v) {
                if (this._height !== v) {
                    this._height = v;
                    this._texture = undefined; // Invalidate.
                }
            },
        },
        background: {
            get: function() {
                return this._background;
            },
            set: function(v) {
                if (this._background !== v) {
                    this._background = v;
                    this._texture = undefined; // Invalidate.
                }
            },
        },
        foreground: {
            get: function() {
                return this._foreground;
            },
            set: function(v) {
                if (this._foreground !== v) {
                    this._foreground = v;
                    this._texture = undefined; // Invalidate.
                }
            },
        },
        text: {
            get: function() {
                return this._text;
            },
            set: function(v) {
                if (this._text !== v) {
                    this._text = v;
                    this._texture = undefined; // Invalidate.
                }
            },
        },
    });
}

// Draw a plane with certain text at the center of universe.
TextRenderer.prototype.draw = function () {
    push();
    texture(this.texture);
    rect(0, 0, this._width, this._height);
    pop();
};
