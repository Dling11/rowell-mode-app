import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { authOrigin } from "@/server/auth/config";
import { HttpError, json, privateHeaders } from "@/server/http";
import { getSitePolicy } from "@/server/site-policy/service";
import {
  commitSave,
  findSaveFolder,
  folderDto,
  hashInvitation,
  saveAssetReferenced,
  type SaveAccess,
  type StoredSave,
} from "@/server/db/game-saves";
import {
  destroySave,
  retrieveSave,
  storeSave,
} from "@/server/media/save-storage";
import {
  MAX_SAVE_BYTES,
  saveMetadataSchema,
} from "@/features/game-saves/model/schema";
import { validateSaveFile } from "@/features/game-saves/model/archive";

export async function sharedAccess(request: Request): Promise<SaveAccess> {
  const policy = await getSitePolicy();
  if (!policy.available || policy.mode === "maintenance")
    throw new HttpError(503, "Save sharing is temporarily unavailable.");
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
    request.headers.get("authorization") || "",
  );
  if (!match)
    throw new HttpError(401, "Open the complete private invitation link.");
  if (
    request.method !== "GET" &&
    (request.headers.get("origin") !== authOrigin() ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    throw new HttpError(403, "Reload this page and try again.");
  return { inviteHash: hashInvitation(match[1]) };
}
export async function handleShared(
  request: Request,
  work: (access: SaveAccess) => Promise<Response>,
) {
  try {
    return await work(await sharedAccess(request));
  } catch (error) {
    return json(
      {
        error:
          error instanceof HttpError
            ? error.message
            : error instanceof ZodError
              ? "Check the save details."
              : "Save sharing is temporarily unavailable. Please try again.",
      },
      error instanceof HttpError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 503,
    );
  }
}
async function readSaveUpload(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new HttpError(415, "Choose a save file to upload.");
  const max = MAX_SAVE_BYTES + 65536;
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Choose a save file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(
          413,
          "Save backups can be up to 4 MB. Game images and apps are not supported.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new HttpError(
      400,
      "The upload did not finish. Select the file again.",
    );
  }
  const metadata = saveMetadataSchema.parse({
    id: form.get("id"),
    title: form.get("title"),
    game: form.get("game"),
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a save file.");
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    validateSaveFile(file.name, bytes);
  } catch (error) {
    throw new HttpError(
      400,
      error instanceof Error ? error.message : "Invalid save archive.",
    );
  }
  return { metadata, bytes, name: file.name };
}
export async function uploadSave(
  request: Request,
  access: SaveAccess,
  folderId?: string,
) {
  const folder = await findSaveFolder(access, folderId);
  const { metadata, bytes, name } = await readSaveUpload(request);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const prior = folder.files.find((f) => f.id === metadata.id);
  if (prior) {
    if (prior.sha256 !== sha256 || prior.game !== metadata.game)
      throw new HttpError(
        409,
        "This upload ID was already used. Select the file again.",
      );
    return json(folderDto(await findSaveFolder(access, folder._id)));
  }
  if (folder.files.length >= 25)
    throw new HttpError(
      409,
      "This folder has 25 backups. Ask the owner to remove an older copy first.",
    );
  const publicId = await storeSave(bytes, randomUUID(), folder._id, name);
  let committed = false;
  try {
    const record: StoredSave = {
      ...metadata,
      name,
      bytes: bytes.length,
      sha256,
      publicId,
      createdAt: new Date().toISOString(),
    };
    committed = await commitSave(access, folder._id, record);
    if (!committed)
      throw new HttpError(
        409,
        "The folder changed, the invitation expired or its backup limit was reached. Refresh before trying again.",
      );
  } finally {
    // A lost DB response can follow a successful write. Never delete the
    // asset until a primary read confirms that no stored backup references it.
    if (!committed && !(await saveAssetReferenced(folder._id, publicId)))
      await destroySave(publicId);
  }
  return json(folderDto(await findSaveFolder(access, folder._id)), 201);
}
export async function downloadSave(
  access: SaveAccess,
  id: string,
  folderId?: string,
) {
  z.string().uuid().parse(id);
  const folder = await findSaveFolder(access, folderId);
  const file = folder.files.find((f) => f.id === id);
  if (!file) throw new HttpError(404, "This backup is unavailable.");
  const bytes = await retrieveSave(file.publicId, file.sha256);
  await findSaveFolder(access, folder._id); // An invitation may have been revoked during retrieval.
  const filename = encodeURIComponent(file.name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16)}`,
  );
  return new Response(new Uint8Array(bytes), {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="save-backup"; filename*=UTF-8''${filename}`,
      "Content-Length": String(bytes.length),
    },
  });
}
