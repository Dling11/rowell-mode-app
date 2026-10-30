import "server-only";
import type { StoredMedia } from "@/server/db/media";

// Only a provider-generated, authenticated derivative is fetched. Never accept a browser URL.
export async function deliverMedia(record: StoredMedia) {
  const failure = (status: number) =>
    new Response("Preview unavailable", {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  if (!record.previewUrl) return failure(404);
  const url = new URL(record.previewUrl);
  if (
    url.origin !== "https://res.cloudinary.com" ||
    url.username ||
    url.password ||
    !url.pathname.includes("/image/authenticated/")
  )
    return failure(404);
  const upstream = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (
    !upstream.ok ||
    !upstream.headers.get("content-type")?.startsWith("image/jpeg") ||
    !upstream.body
  )
    return failure(502);
  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 3 * 1024 * 1024) {
        await reader.cancel();
        return failure(502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": "inline",
    },
  });
}
