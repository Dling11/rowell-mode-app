import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { v2 as cloudinary } from "cloudinary";
import { imagePresetSchema } from "../src/server/media/contracts";
import {
  maxImageBytes,
  uploadFormats,
} from "../src/features/uploads/model/schema";

class SetupError extends Error {}

async function main() {
  const file = ".env.local";
  const initialText = await readFile(file, "utf8");
  const env = parseEnv(initialText);
  for (const name of [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_FOLDER",
  ]) {
    if (!env[name]?.trim())
      throw new SetupError("Required Cloudinary configuration is missing.");
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const ping = await cloudinary.api.ping({ timeout: 10000 });
  const config = await cloudinary.api.config({
    settings: true,
    timeout: 10000,
  });
  const folderMode = config.settings?.folder_mode;
  if (!["dynamic", "fixed"].includes(folderMode || ""))
    throw new SetupError("Cloudinary folder mode could not be verified.");
  const presetOption = process.argv.indexOf("--preset");
  const selectedPreset =
    presetOption >= 0 ? process.argv[presetOption + 1] : undefined;
  if (presetOption >= 0 && (!selectedPreset || selectedPreset.startsWith("--")))
    throw new SetupError("Supply the preset name after --preset.");
  const updateLocalConfiguration =
    process.argv.includes("--create-preset") || presetOption >= 0;
  let preset = selectedPreset || env.CLOUDINARY_UPLOAD_PRESET?.trim();
  let created = false;
  if (!preset) {
    if (!process.argv.includes("--create-preset")) {
      console.log(
        JSON.stringify({
          authenticated: ping.status === "ok",
          folderMode,
          signedImagePresetConfigured: false,
          next: "Run with --create-preset to create a project-specific signed preset. No files or provider settings changed.",
        }),
      );
      return;
    }
    preset = `rowell_mode_local_images_${randomBytes(5).toString("hex")}`;
    await cloudinary.api.create_upload_preset({
      name: preset,
      unsigned: false,
      disallow_public_id: false,
      allowed_formats: [...uploadFormats],
      type: "authenticated",
      overwrite: false,
      timeout: 10000,
    });
    created = true;
  }
  const verified = imagePresetSchema.safeParse(
    await cloudinary.api.upload_preset(preset, { timeout: 10000 }),
  );
  if (!verified.success)
    throw new SetupError(
      "The preset is not signed, private and image-only. Existing settings were not overwritten.",
    );

  const currentText = await readFile(file, "utf8");
  const current = parseEnv(currentText);
  for (const name of [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_FOLDER",
    "CLOUDINARY_UPLOAD_PRESET",
  ]) {
    if (current[name] !== env[name])
      throw new SetupError(
        "Local configuration changed during setup. It was preserved; rerun setup.",
      );
  }
  function setValue(source: string, key: string, value: string) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=[^\\r\\n]*`, "m");
    if (pattern.test(source)) return source.replace(pattern, line);
    const newline = source.includes("\r\n") ? "\r\n" : "\n";
    return `${source.endsWith("\n") ? source : source + newline}${line}${newline}`;
  }
  let updated = setValue(currentText, "CLOUDINARY_UPLOAD_PRESET", preset);
  updated = setValue(updated, "CLOUDINARY_FOLDER_MODE", folderMode!);
  const configurationUpdated =
    updateLocalConfiguration && updated !== currentText;
  if (configurationUpdated) await writeFile(file, updated);
  console.log(
    JSON.stringify(
      {
        authenticated: true,
        presetCreated: created,
        presetVerified: true,
        preset,
        folderMode,
        applicationMaxBytes: maxImageBytes,
        formats: verified.data.settings.allowed_formats,
        privateDelivery: true,
        localConfigurationUpdated: configurationUpdated,
        localConfigurationMatches:
          updated === currentText || configurationUpdated,
        uploadsPerformed: 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      reason:
        error instanceof SetupError
          ? error.message
          : "Cloudinary API request failed.",
      httpCode: error.http_code ?? error.error?.http_code ?? null,
    }),
  );
  process.exitCode = 1;
});
