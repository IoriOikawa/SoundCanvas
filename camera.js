// This file sets parameters for the cameras due to the visualization.

function Camera2D() {
    this.draw = function () {
        camera(width / 2, height / 2, (height / 2.0) / tan(PI * 30.0 / 180.0), width / 2, height / 2, 0, 0, 1, 0);
    }
}

function Camera3D() {
    this.draw = function () {
        camera(0, -height / 2, (height / 2.0) / tan(PI * 30.0 / 180.0), 0, 0, 0, 0, 1, 0);
    }
}
