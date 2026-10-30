import { loadEnvConfig } from "@next/env";
import { getDatabase } from "../src/server/db/client";
import { verifyRelease } from "../src/server/releases/service";
import { defaultSettings } from "../src/features/site-settings/model/policy";
import type { ReleasePointer } from "../src/features/downloads/model/release-schema";

async function main() {
  loadEnvConfig(process.cwd());
  const databaseArg = process.argv.indexOf("--database");
  if (
    databaseArg < 0 ||
    !process.env.MONGODB_DB ||
    process.argv[databaseArg + 1] !== process.env.MONGODB_DB
  ) {
    throw new Error(
      "Use --database with the exact configured MONGODB_DB to initialize this database.",
    );
  }
  const approved: ReleasePointer[] = [
    {
      projectId: "mh-tri",
      platform: "android",
      tag: "rowell-1.4.13",
      asset: "MH3_Rowell_Dev-arm64.apk",
    },
    {
      projectId: "mh-tri",
      platform: "windows",
      tag: "rowell-1.4.13",
      asset: "MH3-Rowell-Windows-x64.zip",
    },
    {
      projectId: "share-mode",
      platform: "android",
      tag: "v1.0.4",
      asset: "Share-Mode-1.0.4.apk",
    },
    {
      projectId: "share-mode",
      platform: "windows",
      tag: "v1.0.4",
      asset: "Share-Mode-Windows-1.0.4.zip",
    },
  ];
  await Promise.all(approved.map(verifyRelease));
  const db = await getDatabase({
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 15000,
    timeoutMS: 60000,
    family: 4,
  });
  console.log(`Initializing database: ${db.databaseName}`);
  await Promise.all([
    db
      .collection("settings")
      .createIndex({ key: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("projects")
      .createIndex({ projectId: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("releases")
      .createIndex(
        { projectId: 1, platform: 1 },
        { unique: true, timeoutMS: 60000 },
      ),
    db
      .collection("notes")
      .createIndex({ id: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("notes")
      .createIndex({ ownerId: 1, updatedAt: -1 }, { timeoutMS: 60000 }),
    db
      .collection("updates")
      .createIndex({ id: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("updates")
      .createIndex({ publishedAt: -1 }, { timeoutMS: 60000 }),
    db
      .collection("media")
      .createIndex({ id: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("media")
      .createIndex({ ownerId: 1, createdAt: -1 }, { timeoutMS: 60000 }),
    db
      .collection("media")
      .createIndex({ publishedAt: -1, id: 1 }, { timeoutMS: 60000 }),
    db
      .collection("uploadIntents")
      .createIndex({ id: 1 }, { unique: true, timeoutMS: 60000 }),
    db
      .collection("uploadIntents")
      .createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, timeoutMS: 60000 },
      ),
    db
      .collection("uploadIntents")
      .createIndex({ ownerId: 1, createdAt: -1 }, { timeoutMS: 60000 }),
    db
      .collection("user")
      .createIndex({ email: 1 }, { unique: true, timeoutMS: 60000 }),
    db.collection("user").createIndex(
      { username: 1 },
      {
        unique: true,
        partialFilterExpression: { username: { $type: "string" } },
        timeoutMS: 60000,
      },
    ),
    db.collection("user").createIndex(
      { isOwner: 1 },
      {
        unique: true,
        partialFilterExpression: { isOwner: true },
        timeoutMS: 60000,
      },
    ),
    db
      .collection("session")
      .createIndex({ token: 1 }, { unique: true, timeoutMS: 60000 }),
    db.collection("session").createIndex({ userId: 1 }, { timeoutMS: 60000 }),
    db
      .collection("session")
      .createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, timeoutMS: 60000 },
      ),
    db
      .collection("account")
      .createIndex(
        { accountId: 1, providerId: 1 },
        { unique: true, timeoutMS: 60000 },
      ),
    db
      .collection("verification")
      .createIndex({ identifier: 1 }, { timeoutMS: 60000 }),
    db
      .collection("verification")
      .createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, timeoutMS: 60000 },
      ),
    db
      .collection("passkey")
      .createIndex({ credentialID: 1 }, { unique: true, timeoutMS: 60000 }),
    db.collection("passkey").createIndex({ userId: 1 }, { timeoutMS: 60000 }),
    db
      .collection("rateLimit")
      .createIndex({ key: 1 }, { unique: true, timeoutMS: 60000 }),
  ]);
  await db.collection("settings").updateOne(
    { key: "site" },
    {
      $setOnInsert: {
        schemaVersion: 1,
        value: { ...defaultSettings, mode: "downloads-paused" },
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  for (const pointer of approved)
    await db.collection("releases").updateOne(
      { projectId: pointer.projectId, platform: pointer.platform },
      {
        $setOnInsert: {
          schemaVersion: 1,
          pointer,
          verifiedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  console.log(
    "Indexes and initial approvals are ready. Existing records were preserved. Initial downloads remain paused until enabled in owner settings.",
  );
  const client = await global.hubMongoPromise;
  await client?.close();
  global.hubMongoPromise = undefined;
}

main().catch(async (error) => {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "Database initialization did not finish.",
      errorType: error?.name || "Error",
    }),
  );
  try {
    await (await global.hubMongoPromise)?.close();
  } catch {
    /* No connected client. */
  }
  global.hubMongoPromise = undefined;
  process.exitCode = 1;
});
