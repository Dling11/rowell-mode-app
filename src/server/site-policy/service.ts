import "server-only";
import { databaseConfigured, getDatabase } from "@/server/db/client";
import { applyEmergencyMode, defaultSettings, settingsSchema, type SitePolicy } from "@/features/site-settings/model/policy";

export async function getSitePolicy(): Promise<SitePolicy> {
  const configured = databaseConfigured();
  try {
    if (!configured) throw new Error("Not configured");
    const db = await getDatabase();
    const record = await db.collection("settings").findOne({ key: "site" });
    const settings = settingsSchema.parse(record?.value);
    return { ...applyEmergencyMode(settings, process.env.SITE_MODE), configured, available: true };
  } catch {
    return { ...applyEmergencyMode(defaultSettings, process.env.SITE_MODE), configured, available: false };
  }
}
