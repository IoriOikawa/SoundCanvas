import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, css] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
]);

test("the studio exposes Dancing Earth as scene 005", () => {
  assert.match(html, /<option value="earth">Dancing Earth<\/option>/);
  assert.match(html, /id="earth-material"/);
  assert.match(app, /const earth = settings\.scene === "earth"/);
  assert.match(app, /earth \? "005"/);
  assert.match(app, /A world, moved by sound\./);
});

test("Earth has a distinct accessible and visual stage treatment", () => {
  assert.match(app, /Dancing Earth: a rotating globe with luminous continents/);
  assert.match(css, /\.earth-scene/);
  assert.match(css, /#earth-material/);
});
