import { z } from "zod";
export const maxImageBytes = 5 * 1024 * 1024;
export const uploadFormats = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export const uploadIntentSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    bytes: z.number().int().positive().max(maxImageBytes),
    mime: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  })
  .strict();
export const completeUploadSchema = z
  .object({ id: z.string().uuid() })
  .strict();
export type MediaRecord = {
  id: string;
  name: string;
  bytes: number;
  format: string;
  createdAt: string;
  alt?: string;
  caption?: string;
  publishedAt?: string | null;
  updatedAt?: string;
};
export const mediaPublicationSchema = z
  .object({
    id: z.string().uuid(),
    alt: z.string().trim().max(200),
    caption: z.string().trim().max(300),
    publish: z.boolean(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (input) => !input.publish || Boolean(input.alt),
    "Published photos need an image description.",
  );
export type PublicPhoto = {
  id: string;
  alt: string;
  caption: string;
  publishedAt: string;
};
export type UploadSignature = {
  id: string;
  url: string;
  fields: Record<string, string>;
  maxBytes: number;
};
export type UploadIntentInput = z.infer<typeof uploadIntentSchema>;
