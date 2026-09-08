import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseTestsPassed } from "./test-db.mjs";

test("a successful process that discovered no SQL tests must fail verification", () => {
  assert.equal(databaseTestsPassed(0, "Files=0, Tests=0\nResult: NOTESTS"), false);
  assert.equal(databaseTestsPassed(0, ""), false);
});
test("requires nonempty passing SQL assertions", () => {
  assert.equal(databaseTestsPassed(0, "Files=19, Tests=290\nResult: PASS"), true);
  assert.equal(databaseTestsPassed(1, "Files=19, Tests=290\nResult: FAIL"), false);
});
