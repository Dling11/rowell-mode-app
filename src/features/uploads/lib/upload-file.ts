import {
  imageMimeTypes,
  maxImageBytes,
  type UploadSignature,
} from "../model/schema";

export function imageFileError(file: File): string | null {
  if (
    file.size <= 0 ||
    file.size > maxImageBytes ||
    !imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])
  ) {
    return "Choose a JPEG, PNG, WebP or AVIF image up to 5 MB.";
  }
  return null;
}

export async function transferImage(
  file: File,
  upload: UploadSignature,
  signal: AbortSignal,
) {
  const error = imageFileError(file);
  if (error || file.size > upload.maxBytes)
    throw new Error(error || "The image exceeds the authorized size.");
  const endpoint = new URL(upload.url);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== "api.cloudinary.com" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !/^\/v1_1\/[A-Za-z0-9_-]+\/image\/upload$/.test(endpoint.pathname)
  ) {
    throw new Error("The upload destination could not be verified.");
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(upload.fields))
    form.append(key, value);
  form.append("file", file);
  const response = await fetch(endpoint.href, {
    method: "POST",
    body: form,
    signal,
  });
  if (!response.ok)
    throw new Error("The image transfer failed. Please try again.");
}
