import test from "node:test";
import assert from "node:assert/strict";
import type { MongoClient } from "mongodb";
import { createHash } from "node:crypto";
import { defaultSettings } from "../../src/features/site-settings/model/policy";
import {
  accessFilter,
  findSaveFolder,
  folderDto,
  commitSave,
  hashInvitation,
  type StoredFolder,
  type StoredSave,
} from "../../src/server/db/game-saves";
import { handleShared } from "../../src/server/game-saves/service";
import { GET as ownerList } from "../../src/app/api/admin/game-saves/route";

const id = "8a4e3b25-3236-4a91-9d5c-5b215e9b3d6c";
test("private saves enforce folder scope, invitation expiry, revocation and atomic limits", async () => {
  const previous = {
    uri: process.env.MONGODB_URI,
    db: process.env.MONGODB_DB,
    url: process.env.BETTER_AUTH_URL,
    mode: process.env.SITE_MODE,
    promise: global.hubMongoPromise,
  };
  const token = "a".repeat(43),
    hash = hashInvitation(token);
  const file: StoredSave = {
    id,
    game: "mh4u",
    title: "Test save",
    name: "user1",
    bytes: 20,
    sha256: createHash("sha256").update("fixture").digest("hex"),
    publicId: "PRIVATE_PROVIDER_KEY",
    createdAt: new Date().toISOString(),
  };
  const folder: StoredFolder = {
    _id: id,
    ownerId: "OWNER_SECRET",
    name: "Person A",
    files: [file],
    bytes: 20,
    createdAt: new Date().toISOString(),
    inviteHash: hash,
    inviteExpiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  let maintenance = false;
  let guardedUpdate: Record<string, unknown> | null = null;
  function matches(query: Record<string, unknown>) {
    if (query._id && query._id !== folder._id) return false;
    if (query.ownerId && query.ownerId !== folder.ownerId) return false;
    if (query.inviteHash && query.inviteHash !== folder.inviteHash)
      return false;
    if (
      query.inviteExpiresAt &&
      (!folder.inviteExpiresAt ||
        folder.inviteExpiresAt <=
          (query.inviteExpiresAt as { $gt: string }).$gt)
    )
      return false;
    return true;
  }
  process.env.MONGODB_URI = "mongodb://isolated.invalid";
  process.env.MONGODB_DB = "isolated-saves-test";
  process.env.BETTER_AUTH_URL = "http://localhost:3100";
  process.env.SITE_MODE = "";
  global.hubMongoPromise = Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        findOne: async (query: Record<string, unknown>) =>
          name === "settings"
            ? {
                key: "site",
                value: {
                  ...defaultSettings,
                  mode: maintenance ? "maintenance" : "normal",
                },
              }
            : matches(query)
              ? folder
              : null,
        updateOne: async (query: Record<string, unknown>) => {
          guardedUpdate = query;
          return { modifiedCount: matches(query) ? 1 : 0 };
        },
      }),
    }),
  } as unknown as MongoClient);
  try {
    await assert.rejects(() =>
      findSaveFolder({ ownerId: "different-owner" }, id),
    );
    await assert.rejects(() =>
      findSaveFolder({ inviteHash: hashInvitation("b".repeat(43)) }, id),
    );
    assert.equal(
      (await findSaveFolder({ inviteHash: hash }, id)).name,
      "Person A",
    );
    const dto = JSON.stringify(folderDto(folder));
    for (const secret of [
      "OWNER_SECRET",
      "PRIVATE_PROVIDER_KEY",
      hash,
      "publicId",
    ])
      assert.ok(!dto.includes(secret));
    assert.equal(
      await commitSave({ inviteHash: hash }, id, {
        ...file,
        id: "a6b32a47-eaa1-4c93-bde0-0422e26461df",
      }),
      true,
    );
    assert.ok(guardedUpdate && "files.24" in guardedUpdate);
    assert.ok(guardedUpdate && "files.id" in guardedUpdate);
    assert.ok(guardedUpdate && "inviteExpiresAt" in guardedUpdate);
    folder.inviteExpiresAt = new Date(Date.now() - 1000).toISOString();
    await assert.rejects(() => findSaveFolder({ inviteHash: hash }));
    assert.equal(await commitSave({ inviteHash: hash }, id, file), false);
    folder.inviteExpiresAt = new Date(Date.now() + 60000).toISOString();
    folder.inviteHash = null;
    await assert.rejects(() => findSaveFolder({ inviteHash: hash }));
    folder.inviteHash = hash;
    const request = (
      authorization?: string,
      method = "GET",
      origin = "http://localhost:3100",
    ) =>
      new Request("http://localhost:3100/api/game-saves/shared", {
        method,
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
          Origin: origin,
        },
      });
    assert.equal(
      (await handleShared(request(), async () => Response.json({ ok: true })))
        .status,
      401,
    );
    assert.equal(
      (
        await handleShared(
          request(`Bearer ${token}`, "POST", "https://other.test"),
          async () => Response.json({ ok: true }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleShared(request(`Bearer ${token}`), async (access) =>
          Response.json(folderDto(await findSaveFolder(access))),
        )
      ).status,
      200,
    );
    maintenance = true;
    assert.equal(
      (
        await handleShared(request(`Bearer ${token}`), async () =>
          Response.json({ ok: true }),
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await ownerList(
          new Request("http://localhost:3100/api/admin/game-saves"),
        )
      ).status,
      401,
    );
    assert.ok(
      !JSON.stringify(accessFilter({ ownerId: "owner" })).includes("invite"),
    );
  } finally {
    for (const [key, value] of Object.entries({
      MONGODB_URI: previous.uri,
      MONGODB_DB: previous.db,
      BETTER_AUTH_URL: previous.url,
      SITE_MODE: previous.mode,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    global.hubMongoPromise = previous.promise;
  }
});
