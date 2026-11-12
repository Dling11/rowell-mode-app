import { z } from "zod";

export const researchStatuses = ["Saved", "Evaluating", "Ready to try", "On hold", "Archived"] as const;
export const repositoryUrlSchema = z.string().trim().max(240).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/[a-z0-9-]{1,39}\/[a-z0-9_.-]{1,100}\/?$/i.test(url.pathname);
  } catch { return false; }
}, "Use a GitHub repository URL.").transform((value) => `https://github.com${new URL(value).pathname.replace(/\/$/, "").replace(/\.git$/i, "")}`.toLowerCase());
const optionalLink = z.string().trim().max(1500).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}, "Use an HTTPS link.");
export const screenshotUrlSchema = optionalLink.refine((value) => {
  if (!value) return true;
  const url = new URL(value);
  return url.hostname === "raw.githubusercontent.com" && !url.port && /\.(png|jpe?g|webp)$/i.test(url.pathname) && !url.search && !url.hash;
}, "Use a PNG, JPEG or WebP from raw.githubusercontent.com, or select a library photo.");
export const researchFields = z.object({
  title: z.string().trim().min(1).max(120),
  repositoryUrl: repositoryUrlSchema,
  websiteUrl: optionalLink.default(""),
  summary: z.string().trim().max(700).default(""),
  status: z.enum(researchStatuses).default("Saved"),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  notes: z.string().max(12000).default(""),
  setupNotes: z.string().max(8000).default(""),
  reviewNotes: z.string().max(8000).default(""),
  localPath: z.string().trim().max(400).default(""),
  license: z.string().trim().max(100).default(""),
  snapshotCommit: z.union([z.literal(""), z.string().regex(/^[a-f0-9]{40}$/)]).default(""),
  snapshotVersion: z.string().trim().max(80).default(""),
  screenshotUrl: screenshotUrlSchema.default(""),
  screenshotMediaId: z.string().uuid().nullable().default(null),
}).strict();
export const saveResearchSchema = researchFields.extend({ id: z.string().uuid().optional(), updatedAt: z.string().datetime().optional() }).strict().refine((item) => !item.id || Boolean(item.updatedAt), "Existing entries need a revision.");
export const researchRevisionSchema = z.object({ id: z.string().uuid(), updatedAt: z.string().datetime() }).strict();
export const upstreamSchema = z.object({
  checkedAt: z.string().datetime(),
  defaultBranch: z.string().max(250),
  latestCommit: z.string().regex(/^[a-f0-9]{40}$/),
  pushedAt: z.string().datetime().nullable(),
  archived: z.boolean(),
  release: z.object({ tag: z.string().max(250), publishedAt: z.string().datetime().nullable(), prerelease: z.boolean() }).nullable(),
}).strict();
export type ResearchFields = z.infer<typeof researchFields>;
export type ResearchItem = ResearchFields & { id: string; createdAt: string; updatedAt: string; upstream: z.infer<typeof upstreamSchema> | null };
export const emptyResearch: ResearchFields = { ...researchFields.omit({ title: true, repositoryUrl: true }).parse({}), title: "", repositoryUrl: "" };
