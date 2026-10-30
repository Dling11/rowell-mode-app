import { z } from "zod";

export const modeSchema = z.enum(["normal", "downloads-paused", "maintenance"]);
export const settingsSchema = z
  .object({
    mode: modeSchema,
    pausedProjects: z.array(z.enum(["mh-tri", "share-mode", "mh4u"])).max(3),
    message: z.string().trim().max(180),
  })
  .strict();
export type SiteSettings = z.infer<typeof settingsSchema>;
export type SitePolicy = SiteSettings & {
  available: boolean;
  configured: boolean;
};
export const defaultSettings: SiteSettings = {
  mode: "normal",
  pausedProjects: [],
  message: "Updates in progress. Please check back soon.",
};
const severity = { normal: 0, "downloads-paused": 1, maintenance: 2 };

export function applyEmergencyMode(
  settings: SiteSettings,
  override?: string,
): SiteSettings {
  if (!override) return settings;
  const parsed = modeSchema.safeParse(override);
  const mode = parsed.success ? parsed.data : "maintenance";
  return severity[mode] > severity[settings.mode]
    ? { ...settings, mode }
    : settings;
}

export function downloadsAllowed(policy: SitePolicy, project: string) {
  return (
    policy.available &&
    policy.mode === "normal" &&
    !policy.pausedProjects.includes(project as "mh-tri")
  );
}
