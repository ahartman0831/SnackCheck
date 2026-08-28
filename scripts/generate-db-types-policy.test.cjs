const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const source = readFileSync(join(__dirname, "generate-db-types.ts"), "utf8");

test("database types are not generated from the linked remote project", () => {
  assert.doesNotMatch(source, /--linked/);
  assert.match(source, /--local/);
});
