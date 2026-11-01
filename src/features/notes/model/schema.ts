import { z } from "zod";
export const noteSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    body: z.string().max(24000),
    updatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (note) => !note.id || Boolean(note.updatedAt),
    "Existing notes need a revision.",
  );
export const deleteNoteSchema = z
  .object({ id: z.string().uuid(), updatedAt: z.string().datetime() })
  .strict();
export type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};
export const publishNoteSchema = z
  .object({
    id: z.string().uuid(),
    updatedAt: z.string().datetime(),
    projectId: z.enum(["personal", "mh-tri", "mh-tri-low-spec", "share-mode", "mh4u"]),
    status: z.enum(["In progress", "In testing", "Released", "On hold"]),
  })
  .strict();
