import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "fflate";
import {
  isSaveEntry,
  safeSavePath,
  validateSaveFile,
} from "../src/features/game-saves/model/archive";
import {
  folderSchema,
  MAX_SAVE_BYTES,
} from "../src/features/game-saves/model/schema";
const bytes = new TextEncoder().encode("synthetic save fixture");
test("save archives accept Native/Azahar and Tri export paths without extracting", () => {
  for (const entries of [
    { system: bytes, user1: bytes },
    { "nand/00010000/524d4850/data/data.bin": bytes, "settings.json": bytes },
  ] as Record<string, Uint8Array>[]) {
    const zip = zipSync(entries, { level: 0 });
    assert.doesNotThrow(() => validateSaveFile("dated-save.zip", zip));
  }
  for (const name of ["system", "user1", "data.bin", "progress.sav"])
    assert.doesNotThrow(() => validateSaveFile(name, bytes));
  assert.equal(folderSchema.safeParse({ name: "  Rowell  " }).success, true);
});
test("save uploads reject game files, executables, incomplete ZIPs and path traversal", () => {
  for (const name of [
    "game.3ds",
    "game.iso",
    "app.apk",
    "script.html",
    "../user1",
    "a\\user1",
  ])
    assert.throws(() => validateSaveFile(name, bytes));
  for (const entries of [
    { "../user1": bytes },
    { user1: bytes, "app.apk": bytes },
    { user1: bytes, "more.zip": bytes },
    { "readme.txt": bytes },
  ] as Record<string, Uint8Array>[])
    assert.throws(() => validateSaveFile("backup.zip", zipSync(entries)));
  assert.throws(() =>
    validateSaveFile("user1", new Uint8Array(MAX_SAVE_BYTES + 1)),
  );
  assert.throws(() => validateSaveFile("backup.zip", bytes));
  assert.throws(() =>
    validateSaveFile("user1", new Uint8Array([0x4d, 0x5a, 0, 0])),
  );
  for (const path of ["/system", "C:/system", "a/../system", "a//user1"])
    assert.equal(safeSavePath(path), false);
  assert.equal(isSaveEntry("save/user2"), true);
});
test("ZIP limits reject huge expansion, symlinks, encrypted and inconsistent entries", () => {
  for (const mutate of [
    (view: DataView, offset: number) =>
      view.setUint32(offset + 24, 40 * 1024 * 1024, true),
    (view: DataView, offset: number) =>
      view.setUint32(offset + 38, 0xa1ff0000, true),
    (view: DataView, offset: number) => view.setUint16(offset + 8, 1, true),
    (view: DataView, offset: number) =>
      view.setUint32(offset + 42, 0xfffffff0, true),
  ]) {
    const zip = zipSync({ user1: bytes }, { level: 0 });
    const view = new DataView(zip.buffer);
    let offset = 0;
    for (; offset < zip.length - 4; offset++)
      if (view.getUint32(offset, true) === 0x02014b50) break;
    mutate(view, offset);
    assert.throws(() => validateSaveFile("backup.zip", zip));
  }
});
