import { z } from "zod";
import { maxImageBytes, uploadFormats } from "@/features/uploads/model/schema";

export type FolderMode = "dynamic" | "fixed";

const optionalFalse = z.preprocess(
  (value) =>
    value === "false" || value === "0" || value === 0 ? false : value,
  z.literal(false).optional(),
);

export const imagePresetSchema = z.object({
  unsigned: z.literal(false),
  disallow_public_id: optionalFalse,
  settings: z
    .object({
      type: z.literal("authenticated"),
      overwrite: optionalFalse,
      disallow_public_id: optionalFalse,
      allowed_formats: z.preprocess(
        (value) =>
          typeof value === "string"
            ? value.split(",").map((format) => format.trim())
            : value,
        z.array(z.enum(uploadFormats)).min(1),
      ),
      public_id_prefix: z.string().optional(),
      use_asset_folder_as_public_id_prefix: optionalFalse,
    })
    .refine(
      (settings) =>
        !settings.public_id_prefix &&
        !settings.use_asset_folder_as_public_id_prefix,
      "The server controls public IDs.",
    ),
});

const uploadedImageSchema = z.object({
  public_id: z.string(),
  resource_type: z.literal("image"),
  type: z.literal("authenticated"),
  bytes: z.number().int().positive().max(maxImageBytes),
  format: z.enum(uploadFormats),
  asset_folder: z.string().optional(),
});

export function validateUploadedImage(
  input: unknown,
  publicId: string,
  assetFolder?: string,
) {
  const image = uploadedImageSchema.parse(input);
  if (
    image.public_id !== publicId ||
    (assetFolder !== undefined && image.asset_folder !== assetFolder)
  ) {
    throw new Error(
      "Uploaded image does not match the authorized destination.",
    );
  }
  return image;
}

export function imageUploadParameters(input: {
  id: string;
  folder: string;
  folderMode: FolderMode;
  preset: string;
  timestamp: number;
}) {
  const destination =
    input.folderMode === "dynamic"
      ? { public_id: `${input.folder}/${input.id}`, asset_folder: input.folder }
      : { public_id: input.id, folder: input.folder };
  return {
    ...destination,
    timestamp: input.timestamp,
    upload_preset: input.preset,
    type: "authenticated",
    overwrite: false,
  };
}
