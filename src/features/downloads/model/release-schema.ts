import { z } from "zod";
export const releasePointerSchema = z
  .object({
    projectId: z.enum(["mh-tri", "mh-tri-low-spec", "share-mode"]),
    platform: z.enum(["android", "windows"]),
    tag: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/),
    asset: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,149}$/),
  })
  .strict()
  .refine(
    (pointer) =>
      pointer.platform === "android"
        ? pointer.asset.endsWith(".apk")
        : pointer.asset.endsWith(".zip"),
    "Asset must match the platform.",
  )
  .refine(
    (pointer) => pointer.projectId !== "mh-tri-low-spec" || (
      pointer.platform === "android" &&
      /^low-spec-[A-Za-z0-9._-]+$/.test(pointer.tag) &&
      /^MH3-Low-Spec-[A-Za-z0-9._-]+-armeabi-v7a\.apk$/.test(pointer.asset)
    ),
    "Low Spec requires its own low-spec release tag and ARMv7 Android APK.",
  );
export type ReleasePointer = z.infer<typeof releasePointerSchema>;

const assetSchema = z.object({
  name: z.string(),
  size: z.number().int().positive(),
  browser_download_url: z.string().url(),
  state: z.literal("uploaded"),
  digest: z.string().nullish(),
});
const releaseSchema = z.object({
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  assets: z.array(assetSchema),
});

export const repositories = {
  "mh-tri": "Dling11/monster_hunter_tri_emulator",
  "mh-tri-low-spec": "Dling11/monster_hunter_tri_emulator",
  "share-mode": "Dling11/share-me-rowell",
} as const;

export function validatePublishedAsset(
  input: unknown,
  pointer: ReleasePointer,
) {
  const release = releaseSchema.parse(input);
  if (
    release.draft ||
    !release.published_at ||
    release.tag_name !== pointer.tag
  )
    throw new Error("Release is not published");
  const asset = release.assets.find((a) => a.name === pointer.asset);
  if (!asset) throw new Error("Asset is not published");
  const expected = `https://github.com/${repositories[pointer.projectId]}/releases/download/${encodeURIComponent(pointer.tag)}/${encodeURIComponent(pointer.asset)}`;
  const url = new URL(asset.browser_download_url);
  if (
    url.href !== expected ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Unexpected asset URL");
  return {
    url: expected,
    bytes: asset.size,
    checksum: asset.digest || null,
    prerelease: release.prerelease,
  };
}

export function shouldCountRequest(request: Request) {
  const headers = request.headers;
  return (
    request.method === "GET" &&
    !headers.has("next-router-prefetch") &&
    !headers.has("x-middleware-prefetch") &&
    !/prefetch|prerender/i.test(
      `${headers.get("purpose")} ${headers.get("sec-purpose")}`,
    ) &&
    !/bot|spider|crawler|headless|preview|monitor|curl|wget|uptime/i.test(
      headers.get("user-agent") || "bot",
    )
  );
}
