import test from "node:test";
import assert from "node:assert/strict";
import { resourceSchema } from "../src/features/projects/model/schema";
import { mediaPublicationSchema } from "../src/features/uploads/model/schema";
test("project references reject executable URLs, credentials and unexpected approval fields", () => {
  const resource = {
    title: "Project site",
    url: "https://example.com/docs",
    kind: "Website",
  };
  assert.equal(resourceSchema.safeParse(resource).success, true);
  for (const url of [
    "javascript:alert(1)",
    "not-a-url",
    "http://example.com/file",
    "https://user:password@example.com/file",
    "https://example.com/a\nb",
  ])
    assert.equal(resourceSchema.safeParse({ ...resource, url }).success, false);
  assert.equal(
    resourceSchema.safeParse({ ...resource, approved: true }).success,
    false,
  );
  const photo = {
    id: "4235d988-1517-4dcb-ac04-b61c68c3ba9c",
    alt: "A photo",
    caption: "",
    publish: true,
    updatedAt: "2026-10-30T00:00:00.000Z",
  };
  assert.equal(mediaPublicationSchema.safeParse(photo).success, true);
  assert.equal(
    mediaPublicationSchema.safeParse({ ...photo, publish: false, alt: "" })
      .success,
    true,
  );
  for (const override of [
    { alt: "" },
    { publicId: "someone-else" },
    { ownerId: "someone-else" },
    { previewUrl: "https://example.com" },
  ])
    assert.equal(
      mediaPublicationSchema.safeParse({ ...photo, ...override }).success,
      false,
    );
});
