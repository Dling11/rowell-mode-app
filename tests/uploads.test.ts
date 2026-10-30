import test from "node:test";
import assert from "node:assert/strict";
import {
  imagePresetSchema,
  imageUploadParameters,
  validateUploadedImage,
} from "../src/server/media/contracts";
import { uploadIntentSchema } from "../src/features/uploads/model/schema";

const safePreset = {
  unsigned: false,
  settings: {
    type: "authenticated",
    overwrite: "0",
    allowed_formats: ["jpg", "png", "webp"],
  },
};
test("upload presets accept provider string formats and reject anonymous/public or broad-format presets", () => {
  assert.equal(imagePresetSchema.safeParse(safePreset).success, true);
  assert.equal(
    imagePresetSchema.safeParse({
      ...safePreset,
      settings: {
        ...safePreset.settings,
        allowed_formats: "jpg,jpeg,png,webp,avif",
        disallow_public_id: "false",
      },
    }).success,
    true,
  );
  assert.equal(
    imagePresetSchema.safeParse({ ...safePreset, unsigned: true }).success,
    false,
  );
  for (const settings of [
    { ...safePreset.settings, type: "upload" },
    { ...safePreset.settings, overwrite: "1" },
    { ...safePreset.settings, allowed_formats: [] },
    { ...safePreset.settings, allowed_formats: ["svg", "pdf"] },
    { ...safePreset.settings, public_id_prefix: "unexpected" },
  ])
    assert.equal(
      imagePresetSchema.safeParse({ ...safePreset, settings }).success,
      false,
    );
  assert.equal(
    imagePresetSchema.safeParse({ ...safePreset, disallow_public_id: true })
      .success,
    false,
  );
});
test("dynamic and fixed Cloudinary folders produce the same authorized public ID", () => {
  const input = {
    id: "image-id",
    folder: "rowell-hub-local",
    preset: "signed-images",
    timestamp: 1,
  };
  const dynamic = imageUploadParameters({ ...input, folderMode: "dynamic" });
  const fixed = imageUploadParameters({ ...input, folderMode: "fixed" });
  assert.equal(dynamic.public_id, "rowell-hub-local/image-id");
  assert.equal(dynamic.asset_folder, "rowell-hub-local");
  assert.equal(fixed.public_id, "image-id");
  assert.equal(fixed.folder, "rowell-hub-local");
  for (const params of [dynamic, fixed]) {
    assert.equal(params.type, "authenticated");
    assert.equal(params.overwrite, false);
  }
});
test("completion rejects wrong owners' destinations, public delivery and unapproved file types", () => {
  const image = {
    public_id: "folder/id",
    resource_type: "image",
    type: "authenticated",
    bytes: 1024,
    format: "png",
    asset_folder: "folder",
  };
  assert.equal(validateUploadedImage(image, "folder/id", "folder").bytes, 1024);
  assert.throws(() => validateUploadedImage(image, "folder/other", "folder"));
  assert.throws(() =>
    validateUploadedImage(image, "folder/id", "other-folder"),
  );
  for (const override of [
    { type: "upload" },
    { resource_type: "raw" },
    { format: "svg" },
    { bytes: 5242881 },
  ]) {
    assert.throws(() =>
      validateUploadedImage({ ...image, ...override }, "folder/id", "folder"),
    );
  }
});
test("upload requests reject zero-size images, executables and unexpected input fields", () => {
  const input = { name: "image.png", bytes: 2048, mime: "image/png" };
  assert.equal(uploadIntentSchema.safeParse(input).success, true);
  for (const override of [
    { bytes: 0 },
    { bytes: 5242881 },
    { mime: "application/octet-stream" },
    { url: "https://example.com" },
  ]) {
    assert.equal(
      uploadIntentSchema.safeParse({ ...input, ...override }).success,
      false,
    );
  }
});
