import "server-only";
import { getDatabase } from "./client";
import type { MediaRecord } from "@/features/uploads/model/schema";
import type { PaginatedResponse } from "@/lib/pagination";

type UploadIntentRecord = {
  id: string;
  ownerId: string;
  publicId: string;
  assetFolder?: string;
  name: string;
  requestedBytes: number;
  createdAt: Date;
  expiresAt: Date;
  completed: boolean;
};
export type StoredMedia = MediaRecord & {
  publicId: string;
  ownerId: string;
  schemaVersion: number;
  previewUrl?: string;
};
const mediaProjection = {
  _id: 0,
  id: 1,
  name: 1,
  bytes: 1,
  format: 1,
  createdAt: 1,
  alt: 1,
  caption: 1,
  publishedAt: 1,
  updatedAt: 1,
} as const;

function mediaDto(record: StoredMedia): MediaRecord {
  return {
    id: record.id,
    name: record.name,
    bytes: record.bytes,
    format: record.format,
    createdAt: record.createdAt,
    alt: record.alt || "",
    caption: record.caption || "",
    publishedAt: record.publishedAt || null,
    updatedAt: record.updatedAt || record.createdAt,
  };
}

export async function recentUploadIntentCount(ownerId: string) {
  return (await getDatabase())
    .collection<UploadIntentRecord>("uploadIntents")
    .countDocuments({
      ownerId,
      createdAt: { $gte: new Date(Date.now() - 3600000) },
    });
}
export async function insertUploadIntent(intent: UploadIntentRecord) {
  await (
    await getDatabase()
  )
    .collection<UploadIntentRecord>("uploadIntents")
    .insertOne(intent);
}
export async function findUploadIntent(ownerId: string, id: string) {
  return (await getDatabase())
    .collection<UploadIntentRecord>("uploadIntents")
    .findOne({ id, ownerId, expiresAt: { $gt: new Date() } });
}
export async function findVerifiedMedia(ownerId: string, id: string) {
  const record = await (
    await getDatabase()
  )
    .collection<StoredMedia>("media")
    .findOne({ id, ownerId }, { projection: mediaProjection });
  return record ? mediaDto(record) : null;
}
export async function recordVerifiedMedia(
  ownerId: string,
  publicId: string,
  media: MediaRecord,
  previewUrl: string,
) {
  const db = await getDatabase();
  await db
    .collection<StoredMedia>("media")
    .updateOne(
      { id: media.id, ownerId },
      {
        $setOnInsert: {
          ...media,
          publicId,
          ownerId,
          previewUrl,
          publishedAt: null,
          updatedAt: media.createdAt,
          schemaVersion: 1,
        },
      },
      { upsert: true },
    );
  await db
    .collection<UploadIntentRecord>("uploadIntents")
    .updateOne({ id: media.id, ownerId }, { $set: { completed: true } });
  const stored = await findVerifiedMedia(ownerId, media.id);
  if (!stored) throw new Error("Verified media was not saved.");
  return stored;
}
export async function listOwnerMedia(
  ownerId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<PaginatedResponse<MediaRecord>> {
  const records = await (
    await getDatabase()
  )
    .collection<StoredMedia>("media")
    .find({ ownerId }, { projection: mediaProjection })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .toArray();
  return {
    items: records.slice(0, limit).map(mediaDto),
    nextPage: records.length > limit ? page + 1 : null,
  };
}
