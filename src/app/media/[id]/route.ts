import { getDatabase } from "@/server/db/client";
import type { StoredMedia } from "@/server/db/media";
import { deliverMedia } from "@/server/media/delivery";
import { getSitePolicy } from "@/server/site-policy/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return new Response(null, { status: 404, headers });
    const policy = await getSitePolicy();
    if (!policy.available || policy.mode === "maintenance")
      return new Response(null, { status: 503, headers });
    const record = await (
      await getDatabase()
    )
      .collection<StoredMedia>("media")
      .findOne({ id, publishedAt: { $type: "string" } });
    if (!record) return new Response(null, { status: 404, headers });
    return await deliverMedia(record);
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
