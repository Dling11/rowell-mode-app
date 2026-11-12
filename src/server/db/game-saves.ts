import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "./client";
import { HttpError } from "@/server/http";
import {
  MAX_BACKUPS,
  MAX_FOLDER_BYTES,
  type SaveFile,
  type SaveFolder,
} from "@/features/game-saves/model/schema";

export type StoredSave = SaveFile & { publicId: string };
export type StoredFolder = {
  _id: string;
  ownerId: string;
  name: string;
  files: StoredSave[];
  bytes: number;
  createdAt: string;
  inviteHash: string | null;
  inviteExpiresAt: string | null;
};
export type SaveAccess = { ownerId: string } | { inviteHash: string };
const folders = async () =>
  (await getDatabase()).collection<StoredFolder>("gameSaveFolders");
export const hashInvitation = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function accessFilter(access: SaveAccess) {
  return "ownerId" in access
    ? { ownerId: access.ownerId }
    : {
        inviteHash: access.inviteHash,
        inviteExpiresAt: { $gt: new Date().toISOString() },
      };
}
export function folderDto(folder: StoredFolder): SaveFolder {
  return {
    id: folder._id,
    name: folder.name,
    bytes: folder.bytes,
    createdAt: folder.createdAt,
    inviteExpiresAt: folder.inviteExpiresAt,
    files: folder.files.map(
      ({ id, game, title, name, bytes, sha256, createdAt }) => ({
        id,
        game,
        title,
        name,
        bytes,
        sha256,
        createdAt,
      }),
    ),
  };
}
export async function findSaveFolder(access: SaveAccess, id?: string) {
  if (id) z.string().uuid().parse(id);
  const folder = await (
    await folders()
  ).findOne({ ...accessFilter(access), ...(id ? { _id: id } : {}) });
  if (!folder)
    throw new HttpError(
      404,
      "This save folder or invitation is unavailable. Ask for a new link if it expired.",
    );
  return folder;
}
export async function listSaveFolders(ownerId: string) {
  return (
    await (await folders())
      .find({ ownerId })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray()
  ).map(folderDto);
}
export async function createSaveFolder(ownerId: string, name: string) {
  const collection = await folders();
  if ((await collection.countDocuments({ ownerId }, { limit: 100 })) >= 100)
    throw new HttpError(409, "The folder limit has been reached.");
  const folder: StoredFolder = {
    _id: randomUUID(),
    ownerId,
    name,
    files: [],
    bytes: 0,
    createdAt: new Date().toISOString(),
    inviteHash: null,
    inviteExpiresAt: null,
  };
  await collection.insertOne(folder);
  return folderDto(folder);
}
export async function updateSaveFolder(
  ownerId: string,
  id: string,
  action: { action: "rename"; name: string } | { action: "invite" | "revoke" },
) {
  await findSaveFolder({ ownerId }, id);
  const token =
    action.action === "invite" ? randomBytes(32).toString("base64url") : null;
  const expires = token
    ? new Date(Date.now() + 7 * 86400000).toISOString()
    : null;
  const value =
    action.action === "rename"
      ? { name: action.name }
      : {
          inviteHash: token ? hashInvitation(token) : null,
          inviteExpiresAt: expires,
        };
  const folder = await (
    await folders()
  ).findOneAndUpdate(
    { _id: id, ownerId },
    { $set: value },
    { returnDocument: "after" },
  );
  if (!folder) throw new HttpError(404, "Folder unavailable.");
  return { folder: folderDto(folder), token };
}
export async function commitSave(
  access: SaveAccess,
  folderId: string,
  file: StoredSave,
) {
  // One document update atomically checks access, expiry, duplicate ID and quota.
  const updated = await (
    await folders()
  ).updateOne(
    {
      _id: folderId,
      ...accessFilter(access),
      "files.id": { $ne: file.id },
      [`files.${MAX_BACKUPS - 1}`]: { $exists: false },
      bytes: { $lte: MAX_FOLDER_BYTES - file.bytes },
    },
    { $push: { files: file }, $inc: { bytes: file.bytes } },
  );
  return updated.modifiedCount === 1;
}
export async function saveAssetReferenced(folderId: string, publicId: string) {
  return Boolean(
    await (
      await folders()
    ).findOne({ _id: folderId, "files.publicId": publicId }),
  );
}
export async function removeSave(
  ownerId: string,
  folderId: string,
  id: string,
  bytes: number,
) {
  await (
    await folders()
  ).updateOne(
    { _id: folderId, ownerId, "files.id": id },
    { $pull: { files: { id } }, $inc: { bytes: -bytes } },
  );
}
