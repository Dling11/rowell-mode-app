import test from "node:test";
import assert from "node:assert/strict";
import { projects } from "../src/data/projects";
import { getProjectWhatsNew } from "../src/features/projects/model/release-notes";

test("Android hotfix notes follow its approval when Windows uses an older release", () => {
  const tri = {
    ...projects.find((project) => project.id === "mh-tri")!,
    whatsNew: { version: "1.4.13-netfix2 · Android", platform: "android" as const,
      tag: "rowell-1.4.13-netfix2", items: ["Previous Android-only hotfix"] },
  };
  const approved = { ...tri, version: null, approvedTags: {
    android: "rowell-1.4.13-netfix2", windows: "rowell-1.4.13",
  } };
  assert.equal(getProjectWhatsNew(approved), tri.whatsNew);
  assert.equal(getProjectWhatsNew({ ...approved, approvedTags: {
    android: "rowell-1.4.13", windows: "rowell-1.4.13-netfix2",
  } }), undefined);
  assert.equal(getProjectWhatsNew({ ...tri, approvedTags: {} }), undefined);
});

test("version-wide notes remain hidden for older approved releases", () => {
  const share = projects.find((project) => project.id === "share-mode")!;
  assert.equal(getProjectWhatsNew(share), share.whatsNew);
  assert.equal(getProjectWhatsNew({ ...share, version: "1.0.4" }), undefined);
  assert.equal(getProjectWhatsNew({ ...share, version: null }), undefined);
});


test("Tri gameplay notes follow matching platform approvals", () => {
  const tri = projects.find((project) => project.id === "mh-tri")!;
  assert.equal(getProjectWhatsNew({ ...tri, version: "1.4.14" }), tri.whatsNew);
  assert.equal(getProjectWhatsNew({ ...tri, version: "1.4.13" }), undefined);
  assert.equal(getProjectWhatsNew({ ...tri, version: null, approvedTags: {
    android: "rowell-1.4.14", windows: "rowell-1.4.13",
  } }), undefined);
});
