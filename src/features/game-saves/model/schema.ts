import { z } from "zod";

export const MAX_SAVE_BYTES = 4 * 1024 * 1024;
export const MAX_BACKUPS = 25;
export const MAX_FOLDER_BYTES = MAX_SAVE_BYTES * MAX_BACKUPS;
export const gameNames = {
  "mh-tri": "Monster Hunter Tri",
  mh4u: "Monster Hunter 4 Ultimate",
} as const;
export const gameSchema = z.enum(["mh-tri", "mh4u"]);
export const folderSchema = z
  .object({ name: z.string().trim().min(1).max(60) })
  .strict();
export const folderActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("rename"), name: folderSchema.shape.name })
    .strict(),
  z.object({ action: z.literal("invite") }).strict(),
  z.object({ action: z.literal("revoke") }).strict(),
]);
export const saveMetadataSchema = z
  .object({
    id: z.string().uuid(),
    game: gameSchema,
    title: z.string().trim().min(1).max(80),
  })
  .strict();
export type SaveFile = z.infer<typeof saveMetadataSchema> & {
  name: string;
  bytes: number;
  sha256: string;
  createdAt: string;
};
export type SaveFolder = {
  id: string;
  name: string;
  files: SaveFile[];
  bytes: number;
  createdAt: string;
  inviteExpiresAt: string | null;
};
