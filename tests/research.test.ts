import test from "node:test";
import assert from "node:assert/strict";
import { repositoryUrlSchema, screenshotUrlSchema, researchFields, saveResearchSchema, emptyResearch } from "../src/features/research/model/schema";

test("research repository links normalize to GitHub and cannot become arbitrary server fetch targets", () => {
  assert.equal(repositoryUrlSchema.parse("https://GitHub.com/Example/Utility.git/"), "https://github.com/example/utility");
  assert.equal(repositoryUrlSchema.parse("https://github.com:443/example/utility"), "https://github.com/example/utility");
  for (const url of ["http://github.com/example/utility", "https://github.com.evil.test/example/utility", "https://user:pass@github.com/example/utility", "https://github.com/example/utility?token=private", "https://github.com/example/utility/issues", "https://127.0.0.1/project", "https://github.com/example/%2e%2e"]) assert.equal(repositoryUrlSchema.safeParse(url).success, false);
});
test("research screenshots use trusted upstream image references while private-library references stay IDs", () => {
  assert.equal(screenshotUrlSchema.safeParse("https://raw.githubusercontent.com/example/utility/main/screenshot.webp").success, true);
  for (const url of ["https://tracker.example/image.png", "https://raw.githubusercontent.com/example/utility/main/image.svg", "https://raw.githubusercontent.com/example/utility/main/image.png?secret=x", "javascript:alert(1)"]) assert.equal(screenshotUrlSchema.safeParse(url).success, false);
});
test("research mutations reject owner assignment, unknown data, stale-revision omissions and oversized notes", () => {
  const valid = { ...emptyResearch, title: "A future tool", repositoryUrl: "https://github.com/example/utility" };
  assert.equal(saveResearchSchema.safeParse(valid).success, true);
  assert.equal(saveResearchSchema.safeParse({ ...valid, ownerId: "someone" }).success, false);
  assert.equal(saveResearchSchema.safeParse({ ...valid, upstream: {} }).success, false);
  assert.equal(saveResearchSchema.safeParse({ ...valid, id: "4235d988-1517-4dcb-ac04-b61c68c3ba9c" }).success, false);
  assert.equal(researchFields.safeParse({ ...valid, notes: "x".repeat(12001) }).success, false);
});
