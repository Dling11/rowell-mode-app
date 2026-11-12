import "server-only";
import { createHash } from "node:crypto";
import { getCloudinaryClient, getUploadConfiguration } from "./config";
import { MAX_SAVE_BYTES } from "@/features/game-saves/model/schema";

export async function storeSave(
  bytes: Buffer,
  id: string,
  folder: string,
  name: string,
) {
  const client = getCloudinaryClient();
  const publicId = `${getUploadConfiguration().folder}/game-saves/${folder}/${id}${name.toLowerCase().endsWith(".zip") ? ".zip" : ".sav"}`;
  const result = await new Promise<{
    public_id: string;
    bytes: number;
    resource_type: string;
    type: string;
  }>((resolve, reject) => {
    client.uploader
      .upload_stream(
        {
          resource_type: "raw",
          type: "authenticated",
          public_id: publicId,
          overwrite: false,
          timeout: 25000,
        },
        (error, result) => {
          if (error || !result)
            reject(new Error("Private save storage is unavailable."));
          else resolve(result);
        },
      )
      .end(bytes);
  });
  if (
    result.public_id !== publicId ||
    result.resource_type !== "raw" ||
    result.type !== "authenticated" ||
    result.bytes !== bytes.length
  ) {
    await destroySave(publicId);
    throw new Error("Save storage verification failed.");
  }
  return publicId;
}
export async function destroySave(publicId: string) {
  const result = await getCloudinaryClient().uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
  if (!["ok", "not found"].includes(result.result))
    throw new Error("Save deletion did not finish.");
}
export async function retrieveSave(publicId: string, expectedHash: string) {
  const client = getCloudinaryClient();
  const url = client.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.body)
    throw new Error("Private save download is unavailable.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SAVE_BYTES) {
        await reader.cancel();
        throw new Error("Unexpected save size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks);
  if (createHash("sha256").update(bytes).digest("hex") !== expectedHash)
    throw new Error("Save checksum does not match.");
  return bytes;
}
