import { z } from "zod";
export const updateSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(140),
    body: z.string().trim().min(1).max(16000),
    projectId: z.enum(["personal", "mh-tri", "mh-tri-low-spec", "share-mode", "mh4u"]),
    status: z.enum(["In progress", "In testing", "Released", "On hold"]),
    publish: z.boolean(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (update) => !update.id || Boolean(update.updatedAt),
    "Existing updates need a revision.",
  );
