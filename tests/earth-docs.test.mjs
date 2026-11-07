import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = Object.fromEntries(
  await Promise.all(
    ["README.md", "README.zh-CN.md", "README.ja.md", "index.html"].map(
      async (name) => [
        name,
        await readFile(new URL(`../${name}`, import.meta.url), "utf8"),
      ],
    ),
  ),
);

test("all three READMEs document Dancing Earth and its data source", () => {
  for (const name of ["README.md", "README.zh-CN.md", "README.ja.md"]) {
    assert.match(files[name], /## Dancing Earth/);
    assert.match(files[name], /docs\/images\/dancing-earth-concept\.png/);
    assert.match(files[name], /docs\/images\/signal-lines-concept\.png/);
    assert.match(files[name], /assets\/EARTH-NOTICE\.md/);
  }
  assert.match(files["README.md"], /five scenes/);
  assert.match(files["README.zh-CN.md"], /五个场景/);
  assert.match(files["README.ja.md"], /5 つのシーン/);
});

test("the studio About dialog credits Natural Earth", () => {
  assert.match(files["index.html"], /Natural Earth/);
  assert.match(files["index.html"], /assets\/EARTH-NOTICE\.md/);
});
