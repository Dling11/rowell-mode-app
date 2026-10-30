import { test } from "node:test";
import assert from "node:assert/strict";
import {
  imageFileError,
  transferImage,
} from "../src/features/uploads/lib/upload-file";
import {
  maxImageBytes,
  type UploadSignature,
} from "../src/features/uploads/model/schema";

const image = new File(["image-test"], "test.png", { type: "image/png" });
const signature: UploadSignature = {
  id: "test",
  url: "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
  fields: { signature: "test-only" },
  maxBytes: maxImageBytes,
};

test("client file checks reject empty, oversized and non-image files", () => {
  assert.equal(imageFileError(image), null);
  assert.ok(imageFileError(new File([], "empty.png", { type: "image/png" })));
  assert.ok(
    imageFileError(
      new File([new Uint8Array(maxImageBytes + 1)], "big.png", {
        type: "image/png",
      }),
    ),
  );
  assert.ok(
    imageFileError(
      new File(["script"], "file.exe", { type: "application/octet-stream" }),
    ),
  );
});

test("direct transfer cannot send a private file to an untrusted or credentialed URL", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 200 }),
  );
  for (const url of [
    "https://untrusted.example/v1_1/test-cloud/image/upload",
    "http://api.cloudinary.com/v1_1/test-cloud/image/upload",
    "https://secret@api.cloudinary.com/v1_1/test-cloud/image/upload",
    "https://api.cloudinary.com/v1_1/test-cloud/video/upload",
    "https://api.cloudinary.com/v1_1/test-cloud/image/upload?redirect=example",
  ])
    await assert.rejects(
      transferImage(image, { ...signature, url }, new AbortController().signal),
    );
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(
    transferImage(
      image,
      { ...signature, maxBytes: 1 },
      new AbortController().signal,
    ),
  );
  assert.equal(fetch.mock.callCount(), 0);
});
