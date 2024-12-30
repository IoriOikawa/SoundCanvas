// Constructor function to handle the onscreen menu, keyboard and mouse
// controls.
function ControlsAndInput() {
    this.camera = new Camera2D();
    this.menuDisplayed = false;

    // Create rendered text for menu.
    this.textrender = new TextRenderer();
    this.textrender.background = '#ff8080';
    this.textrender.foreground = '#ffffff';

    // Resize the plots sizes when the screen is resized.
    this.onResize = function() {
        this.textrender.width = width / 2;
        this.textrender.height = height / 2;
    };
    // Call onResize to set initial values when the object is created.
    this.onResize();

    // Playback button displayed in the top left of the screen.
    this.playbackButton = new PlaybackButton();

    // Make the window fullscreen or revert to windowed.
    this.mousePressed = function() {
        if (!this.playbackButton.hitCheck()) {
            var fs = fullscreen();
            fullscreen(!fs);
        }
    };

    // Responds to keyboard presses.
    // @param keycode the ascii code of the keypressed.
    this.keyPressed = function(keycode) {
        if (keycode == 32) {
            this.menuDisplayed = !this.menuDisplayed;
        }

        if (keycode > 48 && keycode < 58) {
            var visNumber = keycode - 49;
            vis.selectVisual(vis.visuals[visNumber].name);
        }
    };

    // Draws the playback button and potentially the menu.
    this.draw = function() {
        push();
        this.camera.draw();

        // Playback button.
        noStroke();
        this.playbackButton.draw();
        
        // Only draw the menu if menu displayed is set to true.
        if (this.menuDisplayed) {
            translate(0, 0, 1);
            let text = '=== Select Visualization: ===\n';
            for (var i = 0; i < vis.visuals.length; i++) {
                text += (i + 1) + ':  ' + vis.visuals[i].name + '\n';
            }
            text += '> Click mouse to toggle fullscreen. <' + '\n';
            text += '> Press Spacebar to close menu. <' + '\n';
            text += 'Student: Fengkai Wang, No.190312329, 2021' + '\n';
            this.textrender.text = text;
            this.textrender.draw();
        }
        pop();
    };
}