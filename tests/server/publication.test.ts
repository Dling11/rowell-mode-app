import test from "node:test";
import assert from "node:assert/strict";
import type { MongoClient } from "mongodb";
import { getPublicGallery } from "../../src/server/db/gallery";
import { getPublicProjects } from "../../src/server/db/projects";
import { publishNoteCopy } from "../../src/server/db/note-publication";
import { GET as publicImage } from "../../src/app/media/[id]/route";
import { defaultSettings } from "../../src/features/site-settings/model/policy";

type Row = Record<string, unknown>;
function matches(row: Row, query: Row): boolean {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === "object") {
      if ("$type" in value)
        return typeof row[key] === (value as { $type: string }).$type;
      if ("$in" in value)
        return (value as { $in: unknown[] }).$in.includes(row[key]);
    }
    return row[key] === value;
  });
}
function memoryDatabase(records: Record<string, Row[]>) {
  return {
    collection(name: string) {
      const rows = (records[name] ||= []);
      return {
        async findOne(query: Row) {
          return rows.find((row) => matches(row, query)) || null;
        },
        find(query: Row, options?: { projection?: Row }) {
          let selected = rows
            .filter((row) => matches(row, query))
            .map((row) =>
              options?.projection
                ? Object.fromEntries(
                    Object.keys(options.projection)
                      .filter(
                        (key) => options.projection![key] === 1 && key in row,
                      )
                      .map((key) => [key, row[key]]),
                  )
                : { ...row },
            );
          const cursor = {
            sort() {
              return cursor;
            },
            skip(n: number) {
              selected = selected.slice(n);
              return cursor;
            },
            limit(n: number) {
              selected = selected.slice(0, n);
              return cursor;
            },
            async toArray() {
              return selected;
            },
          };
          return cursor;
        },
        async updateOne(query: Row, update: { $setOnInsert?: Row }) {
          if (rows.some((row) => matches(row, query)))
            return { upsertedCount: 0 };
          rows.push({ ...query, ...update.$setOnInsert });
          return { upsertedCount: 1 };
        },
      };
    },
  };
}
const id = "4235d988-1517-4dcb-ac04-b61c68c3ba9c";
const now = "2026-10-30T00:00:00.000Z";

test("public records and media delivery enforce publication while note copies preserve the private original", async () => {
  const oldEnv = {
    uri: process.env.MONGODB_URI,
    db: process.env.MONGODB_DB,
    mode: process.env.SITE_MODE,
  };
  const oldPromise = global.hubMongoPromise;
  const originalFetch = global.fetch;
  const photo: Row = {
    id,
    name: "PRIVATE_FILENAME.png",
    ownerId: "OWNER_SECRET",
    publicId: "PRIVATE_PROVIDER_ID",
    previewUrl:
      "https://res.cloudinary.com/test/image/authenticated/s--test--/safe.jpg",
    alt: "A mountain",
    caption: "A day out",
    publishedAt: now,
  };
  const privatePhoto = {
    ...photo,
    id: "b01036ba-8fa0-46cd-83eb-119627ad6785",
    publishedAt: null,
  };
  const note: Row = {
    id,
    title: "A selected idea",
    body: "A note to share",
    ownerId: "owner",
    updatedAt: now,
    internalMarker: "NEVER_PUBLIC",
  };
  const records = {
    media: [photo, privatePhoto],
    notes: [note],
    updates: [] as Row[],
    projects: [
      { projectId: "mh-tri", coverMediaId: id, internalMarker: "NEVER_PUBLIC" },
    ],
    settings: [{ key: "site", value: defaultSettings }],
    releases: [],
  };
  const db = memoryDatabase(records);
  process.env.MONGODB_URI = "mongodb://isolated.invalid";
  process.env.MONGODB_DB = "isolated-publication-test";
  process.env.SITE_MODE = "";
  global.hubMongoPromise = Promise.resolve({
    db: () => db,
  } as unknown as MongoClient);
  let fetched = 0;
  global.fetch = async (input) => {
    fetched++;
    assert.ok(String(input).startsWith("https://res.cloudinary.com/"));
    return new Response(new Uint8Array([255, 216, 255]), {
      headers: { "Content-Type": "image/jpeg" },
    });
  };
  try {
    const gallery = await getPublicGallery();
    assert.equal(gallery.photos.length, 1);
    assert.deepEqual(Object.keys(gallery.photos[0]).sort(), [
      "alt",
      "caption",
      "id",
      "publishedAt",
    ]);
    assert.ok(!JSON.stringify(gallery).includes("PRIVATE_"));
    const projects = await getPublicProjects();
    assert.equal(projects[0].coverImage?.src, `/media/${id}`);
    assert.ok(!JSON.stringify(projects).includes("NEVER_PUBLIC"));
    const request = new Request(`https://hub.example/media/${id}`);
    const response = await publicImage(request, {
      params: Promise.resolve({ id }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.ok(!JSON.stringify([...response.headers]).includes("cloudinary"));
    assert.equal(fetched, 1);
    photo.publishedAt = null;
    assert.equal(
      (await publicImage(request, { params: Promise.resolve({ id }) })).status,
      404,
    );
    assert.equal(fetched, 1);
    assert.equal((await getPublicProjects())[0].coverImage, undefined);
    assert.equal((await getPublicGallery()).photos.length, 0);
    const input = {
      id,
      updatedAt: now,
      projectId: "mh-tri" as const,
      status: "In progress" as const,
    };
    await assert.rejects(publishNoteCopy("someone-else", input));
    await assert.rejects(
      publishNoteCopy("owner", {
        ...input,
        updatedAt: "2026-10-29T00:00:00.000Z",
      }),
    );
    assert.equal(records.updates.length, 0);
    assert.equal((await publishNoteCopy("owner", input)).alreadyExists, false);
    assert.equal(records.notes[0], note);
    assert.ok(!("ownerId" in records.updates[0]));
    assert.ok(!("internalMarker" in records.updates[0]));
    note.body = "Later private changes";
    assert.equal((await publishNoteCopy("owner", input)).alreadyExists, true);
    assert.equal(records.updates.length, 1);
    assert.equal(records.updates[0].body, "A note to share");
    photo.publishedAt = now;
    process.env.SITE_MODE = "maintenance";
    assert.equal(
      (await publicImage(request, { params: Promise.resolve({ id }) })).status,
      503,
    );
    assert.equal(fetched, 1);
  } finally {
    global.fetch = originalFetch;
    global.hubMongoPromise = oldPromise;
    for (const [key, value] of Object.entries({
      MONGODB_URI: oldEnv.uri,
      MONGODB_DB: oldEnv.db,
      SITE_MODE: oldEnv.mode,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
