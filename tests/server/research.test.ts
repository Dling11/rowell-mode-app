import test from "node:test";
import assert from "node:assert/strict";
import type { MongoClient } from "mongodb";
import { saveResearch, listResearch, deleteResearch, refreshResearch } from "../../src/server/db/research";
import { checkResearchUpstream } from "../../src/server/research/github";
import { emptyResearch } from "../../src/features/research/model/schema";

type Row = Record<string, unknown>;
function matches(row: Row, filter: Row): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return (value as Row[]).some((item) => matches(row, item));
    if (value && typeof value === "object" && "$ne" in value) return row[key] !== value.$ne;
    if (value && typeof value === "object" && "$regex" in value) return new RegExp(String(value.$regex), "i").test(String(row[key]));
    return row[key] === value;
  });
}
test("research stays owner-scoped, preserves drafts on conflicts and refreshes only public GitHub metadata", async () => {
  const old = { uri: process.env.MONGODB_URI, db: process.env.MONGODB_DB, promise: global.hubMongoPromise, fetch: global.fetch };
  const rows: Row[] = [];
  const records = {
    async findOne(filter: Row) { return rows.find((row) => matches(row, filter)) || null; },
    async insertOne(row: Row) { rows.push({ ...row, internalMarker: "PRIVATE_INTERNAL" }); },
    async findOneAndUpdate(filter: Row, update: { $set: Row }) { const row = rows.find((row) => matches(row, filter)); if (!row) return null; Object.assign(row, update.$set); return { ...row }; },
    async deleteOne(filter: Row) { const index = rows.findIndex((row) => matches(row, filter)); if (index < 0) return { deletedCount: 0 }; rows.splice(index, 1); return { deletedCount: 1 }; },
    find(filter: Row) { let found = rows.filter((row) => matches(row, filter)); const cursor = { sort() { return cursor; }, skip(n: number) { found = found.slice(n); return cursor; }, limit(n: number) { found = found.slice(0, n); return cursor; }, async toArray() { return found; } }; return cursor; },
  };
  const db = { collection(name: string) { return name === "researchItems" ? records : { async findOne() { return null; } }; } };
  process.env.MONGODB_URI = "mongodb://isolated.invalid";
  process.env.MONGODB_DB = "isolated-research";
  global.hubMongoPromise = Promise.resolve({ db: () => db } as unknown as MongoClient);
  let requests = 0;
  global.fetch = async (input) => {
    requests++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    if (url.pathname.endsWith("/commits/main")) return Response.json({ sha: "b".repeat(40) });
    if (url.pathname.endsWith("/releases")) return Response.json([{ tag_name: "v2.0.0", published_at: "2026-11-12T00:00:00Z", draft: false, prerelease: true }]);
    return Response.json({ default_branch: "main", pushed_at: "2026-11-12T00:00:00Z", archived: false, private: false });
  };
  try {
    const input = { ...emptyResearch, title: "Utility [.*]", repositoryUrl: "https://github.com/example/utility", notes: "Private future plan", snapshotCommit: "a".repeat(40) };
    const saved = await saveResearch("owner", input);
    assert.ok(!("ownerId" in saved) && !("internalMarker" in saved));
    assert.equal((await listResearch("someone-else", 1, "", "")).items.length, 0);
    assert.equal((await listResearch("owner", 1, "[.*]", "")).items.length, 1);
    assert.equal((await listResearch("owner", 1, "nonmatching", "")).items.length, 0);
    await assert.rejects(saveResearch("owner", input), /already in your research/);
    await assert.rejects(saveResearch("owner", { ...input, repositoryUrl: "https://github.com/example/private-photo", screenshotMediaId: "4235d988-1517-4dcb-ac04-b61c68c3ba9c" }), /your media library/);
    await assert.rejects(deleteResearch("someone-else", saved.id, saved.updatedAt));
    await assert.rejects(refreshResearch("someone-else", saved.id, saved.updatedAt));
    assert.equal(requests, 0);
    await assert.rejects(checkResearchUpstream("https://127.0.0.1/private"));
    assert.equal(requests, 0);
    const updated = await saveResearch("owner", { ...input, id: saved.id, updatedAt: saved.updatedAt, notes: "Edited private plan" });
    assert.notEqual(updated.updatedAt, saved.updatedAt);
    await assert.rejects(saveResearch("owner", { ...input, id: saved.id, updatedAt: saved.updatedAt }), /another window/);
    const checked = await refreshResearch("owner", updated.id, updated.updatedAt);
    assert.equal(checked.notes, "Edited private plan");
    assert.equal(checked.snapshotCommit, "a".repeat(40));
    assert.equal(checked.upstream?.latestCommit, "b".repeat(40));
    assert.equal(requests, 3);
    await assert.rejects(refreshResearch("owner", checked.id, checked.updatedAt), /wait a minute/);
    global.fetch = async () => Response.json({ error: "unavailable" }, { status: 503 });
    await assert.rejects(checkResearchUpstream(input.repositoryUrl));
    assert.equal(rows[0].notes, "Edited private plan");
    const moved = await saveResearch("owner", { ...input, repositoryUrl: "https://github.com/example/other", id: checked.id, updatedAt: checked.updatedAt });
    assert.equal(moved.upstream, null);
    await assert.rejects(deleteResearch("owner", moved.id, checked.updatedAt));
    await deleteResearch("owner", moved.id, moved.updatedAt);
    assert.equal(rows.length, 0);
  } finally {
    global.hubMongoPromise = old.promise; global.fetch = old.fetch;
    if (old.uri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = old.uri;
    if (old.db === undefined) delete process.env.MONGODB_DB; else process.env.MONGODB_DB = old.db;
  }
});
