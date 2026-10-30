import "server-only";
import { randomUUID } from "node:crypto";
import { HttpError } from "@/server/http";
import {
  findUploadIntent,
  findVerifiedMedia,
  insertUploadIntent,
  recentUploadIntentCount,
  recordVerifiedMedia,
} from "@/server/db/media";
import {
  maxImageBytes,
  type UploadIntentInput,
  type UploadSignature,
} from "@/features/uploads/model/schema";
import { getCloudinaryClient, getUploadConfiguration } from "./config";
import {
  imagePresetSchema,
  imageUploadParameters,
  validateUploadedImage,
} from "./contracts";

export async function createUploadIntent(
  ownerId: string,
  input: UploadIntentInput,
): Promise<UploadSignature> {
  const sdk = getCloudinaryClient();
  const config = getUploadConfiguration();
  const preset = imagePresetSchema.safeParse(
    await sdk.api.upload_preset(config.preset, { timeout: 8000 }),
  );
  if (!preset.success)
    throw new HttpError(
      503,
      "The upload preset must be signed, private and image-only.",
    );
  if ((await recentUploadIntentCount(ownerId)) >= 20)
    throw new HttpError(429, "Upload limit reached. Please try again later.");

  const id = randomUUID();
  const publicId = `${config.folder}/${id}`;
  const params = imageUploadParameters({
    id,
    ...config,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const signature = sdk.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!,
  );
  await insertUploadIntent({
    id,
    ownerId,
    publicId,
    ...(config.folderMode === "dynamic" ? { assetFolder: config.folder } : {}),
    name: input.name,
    requestedBytes: input.bytes,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    completed: false,
  });
  return {
    id,
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME!.trim()}/image/upload`,
    fields: Object.fromEntries(
      Object.entries({
        ...params,
        signature,
        api_key: process.env.CLOUDINARY_API_KEY!.trim(),
      }).map(([key, value]) => [key, String(value)]),
    ),
    maxBytes: maxImageBytes,
  };
}

export async function completeUpload(ownerId: string, id: string) {
  const existing = await findVerifiedMedia(ownerId, id);
  if (existing) return existing;
  const intent = await findUploadIntent(ownerId, id);
  if (!intent)
    throw new HttpError(404, "Upload session expired. Start a new upload.");
  const sdk = getCloudinaryClient();
  const resource: unknown = await sdk.api.resource(intent.publicId, {
    resource_type: "image",
    type: "authenticated",
    timeout: 8000,
  });
  let image;
  try {
    image = validateUploadedImage(
      resource,
      intent.publicId,
      intent.assetFolder,
    );
  } catch {
    throw new HttpError(400, "The uploaded image could not be verified.");
  }
  const preview = await sdk.uploader.explicit(intent.publicId, {
    type: "authenticated",
    resource_type: "image",
    timeout: 12000,
    eager: [
      {
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: 80,
        format: "jpg",
        flags: "strip_profile",
      },
    ],
    eager_async: false,
  });
  const previewUrl = preview.eager?.[0]?.secure_url;
  if (
    typeof previewUrl !== "string" ||
    !previewUrl.startsWith("https://res.cloudinary.com/")
  )
    throw new HttpError(
      503,
      "The image preview is not ready. Retry verification.",
    );
  return recordVerifiedMedia(
    ownerId,
    intent.publicId,
    {
      id,
      name: intent.name,
      bytes: image.bytes,
      format: image.format,
      createdAt: new Date().toISOString(),
    },
    previewUrl,
  );
}
