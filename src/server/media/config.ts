import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { HttpError } from "@/server/http";
import type { FolderMode } from "./contracts";

export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (
    !cloudName ||
    !apiKey ||
    !apiSecret ||
    !/^[A-Za-z0-9_-]+$/.test(cloudName)
  ) {
    throw new HttpError(
      503,
      "Cloudinary credentials are not configured correctly.",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

export function getUploadConfiguration() {
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  const folder = process.env.CLOUDINARY_FOLDER?.trim();
  const folderMode = process.env.CLOUDINARY_FOLDER_MODE?.trim() || "dynamic";
  if (
    !preset ||
    !/^[A-Za-z0-9_-]+$/.test(preset) ||
    !folder ||
    folder.length > 180 ||
    !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(folder) ||
    !["dynamic", "fixed"].includes(folderMode)
  ) {
    throw new HttpError(
      503,
      "Configure a signed image preset and a media folder before uploading.",
    );
  }
  return { preset, folder, folderMode: folderMode as FolderMode };
}
