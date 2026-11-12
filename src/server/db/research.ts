import "server-only";
import { randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { getDatabase } from "./client";
import { HttpError } from "@/server/http";
import { researchFields, saveResearchSchema, upstreamSchema, type ResearchItem } from "@/features/research/model/schema";
import { checkResearchUpstream } from "@/server/research/github";
import type { z } from "zod";

type StoredResearch = ResearchItem & { ownerId: string; schemaVersion: number };
const collection = async () => (await getDatabase()).collection<StoredResearch>("researchItems");
const nextRevision = (previous: string) => new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
function dto(record: StoredResearch): ResearchItem {
  const metadata = upstreamSchema.safeParse(record.upstream);
  return { ...researchFields.parse(Object.fromEntries(Object.keys(researchFields.shape).map((key) => [key, record[key as keyof StoredResearch]]))), id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt, upstream: metadata.success ? metadata.data : null };
}
export async function listResearch(ownerId: string, page: number, search: string, status: string) {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = { ownerId, ...(status ? { status: status as ResearchItem["status"] } : {}), ...(search ? { $or: [{ title: { $regex: escaped, $options: "i" } }, { summary: { $regex: escaped, $options: "i" } }, { tags: { $regex: escaped, $options: "i" } }] } : {}) };
  const records = await (await collection()).find(filter).sort({ updatedAt: -1 }).skip((page - 1) * 20).limit(21).toArray();
  return { items: records.slice(0, 20).map(dto), nextPage: records.length > 20 ? page + 1 : null };
}
export async function saveResearch(ownerId: string, raw: z.infer<typeof saveResearchSchema>) {
  const input = saveResearchSchema.parse(raw);
  const fields = researchFields.parse(Object.fromEntries(Object.keys(researchFields.shape).map((key) => [key, input[key as keyof typeof input]])));
  const db = await getDatabase();
  if (fields.screenshotMediaId && !await db.collection("media").findOne({ id: fields.screenshotMediaId, ownerId })) throw new HttpError(400, "Choose a photo from your media library.");
  const records = await collection();
  const duplicate = await records.findOne({ ownerId, repositoryUrl: fields.repositoryUrl, ...(input.id ? { id: { $ne: input.id } } : {}) });
  if (duplicate) throw new HttpError(409, "This repository is already in your research list.");
  const now = new Date().toISOString();
  try {
    if (input.id) {
      const prior = await records.findOne({ id: input.id, ownerId, updatedAt: input.updatedAt });
      if (!prior) throw new HttpError(409, "This entry changed in another window. Reload it before saving.");
      const saved = await records.findOneAndUpdate({ id: input.id, ownerId, updatedAt: input.updatedAt }, { $set: { ...fields, upstream: prior.repositoryUrl === fields.repositoryUrl ? prior.upstream : null, updatedAt: nextRevision(prior.updatedAt) } }, { returnDocument: "after" });
      if (!saved) throw new HttpError(409, "This entry changed in another window. Reload it before saving.");
      return dto(saved);
    }
    const record: StoredResearch = { ...fields, id: randomUUID(), ownerId, createdAt: now, updatedAt: now, upstream: null, schemaVersion: 1 };
    await records.insertOne(record);
    return dto(record);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new HttpError(409, "This repository is already in your research list.");
    throw error;
  }
}
export async function deleteResearch(ownerId: string, id: string, updatedAt: string) {
  const result = await (await collection()).deleteOne({ ownerId, id, updatedAt });
  if (!result.deletedCount) throw new HttpError(409, "This entry changed or was already removed. Reload the list.");
}
export async function refreshResearch(ownerId: string, id: string, updatedAt: string) {
  const records = await collection();
  const record = await records.findOne({ id, ownerId, updatedAt });
  if (!record) throw new HttpError(409, "Reload this entry before checking GitHub.");
  if (record.upstream && Date.now() - Date.parse(record.upstream.checkedAt) < 60000) throw new HttpError(429, "This entry was just checked. Please wait a minute.");
  const upstream = await checkResearchUpstream(record.repositoryUrl);
  const saved = await records.findOneAndUpdate({ id, ownerId, updatedAt }, { $set: { upstream, updatedAt: nextRevision(updatedAt) } }, { returnDocument: "after" });
  if (!saved) throw new HttpError(409, "This entry changed during the check. Reload it to see the latest notes.");
  return dto(saved);
}
