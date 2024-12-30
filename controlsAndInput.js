// !!! Text should be enabled in WEBGL !!!
// https://github.com/processing/p5.js/issues/2183

//Constructor function to handle the onscreen menu, keyboard and mouse
//controls
function ControlsAndInput() {

    this.menuDisplayed = false;

    //render space for text
    this._text = createGraphics(width / 2, height / 3);
//    this._text.background(255, 127, 127, 127);
    this._text.background(30, 230);
//    this._text.clearColor(0, 0, 0, 0);
    this._text.fill(255);
    this._text.strokeWeight(2);
    this._text.textSize(34);
    this._text.text('Select Visualization:', 100, 50);


    //playback button displayed in the top left of the screen
    this.playbackButton = new PlaybackButton();

    //make the window fullscreen or revert to windowed
    this.mousePressed = function () {
        if (!this.playbackButton.hitCheck()) {
            var fs = fullscreen();
            fullscreen(!fs);
        }
    };

    //responds to keyboard presses
    //@param keycode the ascii code of the keypressed
    this.keyPressed = function (keycode) {
        console.log(keycode);
        if (keycode == 32) {
            this.menuDisplayed = !this.menuDisplayed;
        }

        if (keycode > 48 && keycode < 58) {
            var visNumber = keycode - 49;
            vis.selectVisual(vis.visuals[visNumber].name);
        }
    };

    //draws the playback button and potentially the menu
    this.draw = function () {
        // !!! Camera position need to be fixed !!!
        camera(width / 2, height / 2, (height / 2.0) / tan(PI * 30.0 / 180.0), width / 2, height / 2, 0, 0, 1, 0);
        push();
        //		fill("white");
        //		stroke("black");
        //		strokeWeight(2);
        //		textSize(34);

        //playback button 
        this.playbackButton.draw();
        //only draw the menu if menu displayed is set to true.
        if (this.menuDisplayed) {

            // text("Select a visualisation:", 100, 30);
            texture(this._text);
            translate(width / 4, height / 6);
            // !!! Figure out the background !!!
//            fill(210, 210, 210, 10);
            plane(width / 2, height / 3);
            //this.menu();
        }
        pop();

    };

    this.menu = function () {
        //draw out menu items for each visualisation
        for (var i = 0; i < vis.visuals.length; i++) {

            var yLoc = 70 + i * 40;

            text((i + 1) + ":  " + vis.visuals[i].name);
            // !!! Replacing to the following... !!!
            // this._selectiontext = createGraphics(width / 3, height / 3);
            // this._selectiontext.background(180);
            // this._selectiontext.fill(255);
            // this._selectiontext.strokeWeight(2);
            // this._selectiontext.textSize(34);
            // this._selectiontext.text((i + 1) + ":  " + vis.visuals[i].name, 100, yLoc);


        }
    };
}
