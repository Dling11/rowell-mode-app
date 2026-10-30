import { z } from "zod";
export const resourceSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    url: z
      .string()
      .trim()
      .max(1500)
      .refine((value) => {
        if (/[\u0000-\u0020\u007f]/.test(value)) return false;
        try {
          const url = new URL(value);
          return (
            value.startsWith("https://") &&
            url.protocol === "https:" &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, "Use an HTTPS link without credentials."),
    kind: z.enum(["Website", "Game files", "Documentation", "Source"]),
  })
  .strict();
export const projectEditSchema = z
  .object({
    projectId: z.enum(["mh-tri", "share-mode", "mh4u"]),
    summary: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1200),
    status: z.enum(["Released", "In testing", "In progress", "On hold"]),
    resources: z.array(resourceSchema).max(12),
    coverMediaId: z.string().uuid().nullable(),
  })
  .strict();
