import test from "node:test";
import assert from "node:assert/strict";
import type { MongoClient } from "mongodb";
import { getPublicGallery } from "../../src/server/db/gallery";
import { getPublicProjects } from "../../src/server/db/projects";
import { publishNoteCopy } from "../../src/server/db/note-publication";
import { GET as publicImage } from "../../src/app/media/[id]/route";
import { defaultSettings } from "../../src/features/site-settings/model/policy";
import { HEAD as download } from "../../src/app/download/[project]/[platform]/route";

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

test("project release notes follow the approved platform versions, including older and mixed approvals", async () => {
  const oldEnv = { uri: process.env.MONGODB_URI, db: process.env.MONGODB_DB };
  const oldPromise = global.hubMongoPromise;
  const releases: Row[] = [
    { projectId: "share-mode", platform: "android", pointer: { projectId: "share-mode", platform: "android", tag: "v1.0.4", asset: "Share-Mode-1.0.4.apk" } },
    { projectId: "share-mode", platform: "windows", pointer: { projectId: "share-mode", platform: "windows", tag: "v1.0.4", asset: "Share-Mode-Windows-1.0.4.zip" } },
  ];
  const db = memoryDatabase({ releases });
  process.env.MONGODB_URI = "mongodb://isolated.invalid";
  process.env.MONGODB_DB = "isolated-approved-release-test";
  global.hubMongoPromise = Promise.resolve({ db: () => db } as unknown as MongoClient);
  try {
    let project = (await getPublicProjects()).find((project) => project.id === "share-mode")!;
    assert.equal(project.version, "1.0.4");
    assert.equal(project.release, "https://github.com/Dling11/share-me-rowell/releases/tag/v1.0.4");
    assert.equal(project.releaseLabel, "Public preview");

    for (const release of releases) {
      const pointer = release.pointer as Record<string, string>;
      pointer.tag = "v1.0.3";
      pointer.asset = pointer.asset.replace("1.0.4", "1.0.3");
    }
    project = (await getPublicProjects()).find((project) => project.id === "share-mode")!;
    assert.equal(project.version, "1.0.3");
    assert.equal(project.release, "https://github.com/Dling11/share-me-rowell/releases/tag/v1.0.3");
    assert.equal(project.releaseLabel, "Owner-approved public release");

    (releases[1].pointer as Record<string, string>).tag = "v1.0.4";
    (releases[1].pointer as Record<string, string>).asset = "Share-Mode-Windows-1.0.4.zip";
    project = (await getPublicProjects()).find((project) => project.id === "share-mode")!;
    assert.equal(project.version, null);
    assert.equal(project.release, "https://github.com/Dling11/share-me-rowell/releases");
    assert.deepEqual(project.approvedTags, { android: "v1.0.3", windows: "v1.0.4" });
    assert.equal((await getPublicProjects()).find((project) => project.id === "mh4u")!.release, null);
  } finally {
    global.hubMongoPromise = oldPromise;
    for (const [key, value] of Object.entries({ MONGODB_URI: oldEnv.uri, MONGODB_DB: oldEnv.db })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Low Spec stays unpublished without its own pin and cannot change standard downloads", async () => {
  const oldEnv = { uri: process.env.MONGODB_URI, db: process.env.MONGODB_DB, mode: process.env.SITE_MODE, token: process.env.GITHUB_RELEASE_TOKEN };
  const oldPromise = global.hubMongoPromise;
  const originalFetch = global.fetch;
  const standard = { projectId: "mh-tri", platform: "android", tag: "rowell-1.4.13", asset: "MH3_Rowell_Dev-arm64.apk" };
  const low = { projectId: "mh-tri-low-spec", platform: "android", tag: "low-spec-0.1.2", asset: "MH3-Low-Spec-0.1-armeabi-v7a.apk" };
  const releases: Row[] = [{ projectId: standard.projectId, platform: "android", pointer: standard }];
  const policy = { ...defaultSettings, pausedProjects: [] as string[] };
  const db = memoryDatabase({ releases, settings: [{ key: "site", value: policy }] });
  process.env.MONGODB_URI = "mongodb://isolated.invalid";
  process.env.MONGODB_DB = "isolated-low-spec-download-test";
  delete process.env.SITE_MODE;
  delete process.env.GITHUB_RELEASE_TOKEN;
  global.hubMongoPromise = Promise.resolve({ db: () => db } as unknown as MongoClient);
  const assetUrl = (pointer: typeof standard) => `https://github.com/Dling11/monster_hunter_tri_emulator/releases/download/${pointer.tag}/${pointer.asset}`;
  let calls = 0;
  global.fetch = async (input) => {
    calls++;
    const pointer = String(input).endsWith(low.tag) ? low : standard;
    return Response.json({ tag_name: pointer.tag, draft: false, prerelease: true, published_at: now, assets: [{ name: pointer.asset, state: "uploaded", size: 20374522, browser_download_url: assetUrl(pointer) }] });
  };
  const request = new Request("https://hub.example/download/mh-tri-low-spec/android", { method: "HEAD" });
  const resolve = (project: string, platform = "android") => download(request, { params: Promise.resolve({ project, platform }) });
  try {
    assert.equal((await getPublicProjects()).find(p => p.id === low.projectId)!.release, null);
    assert.equal((await resolve(low.projectId)).status, 503);
    assert.equal(calls, 0);
    assert.equal((await resolve(low.projectId, "windows")).status, 404);
    assert.equal((await resolve("mh4u")).status, 404);
    releases.push({ projectId: low.projectId, platform: "android", pointer: low });
    const projects = await getPublicProjects();
    const lowProject = projects.find(p => p.id === low.projectId)!;
    assert.equal(lowProject.release, `https://github.com/Dling11/monster_hunter_tri_emulator/releases/tag/${low.tag}`);
    assert.equal(lowProject.version, "0.1.2");
    assert.match(lowProject.releaseLabel, /Experimental/);
    assert.equal(projects.find(p => p.id === "mh-tri")!.version, "1.4.13");
    assert.equal((await resolve(low.projectId)).headers.get("location"), assetUrl(low));
    assert.equal((await resolve("mh-tri")).headers.get("location"), assetUrl(standard));
    policy.pausedProjects.push(low.projectId);
    assert.equal((await resolve(low.projectId)).status, 503);
    assert.equal((await resolve("mh-tri")).status, 307);
    policy.mode = "downloads-paused";
    assert.equal((await resolve(low.projectId)).status, 503);
    assert.equal((await resolve("mh-tri")).status, 503);
    assert.equal(releases.length, 2);
    assert.deepEqual(releases[0].pointer, standard);
  } finally {
    global.fetch = originalFetch;
    global.hubMongoPromise = oldPromise;
    for (const [key, value] of Object.entries({ MONGODB_URI: oldEnv.uri, MONGODB_DB: oldEnv.db, SITE_MODE: oldEnv.mode, GITHUB_RELEASE_TOKEN: oldEnv.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
