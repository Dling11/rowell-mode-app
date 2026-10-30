import { handleAdmin, json } from "@/server/http";
import { listOwnerMedia } from "@/server/db/media";
import { getPage } from "@/server/db/pagination";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleAdmin(request, false, async (owner) => {
    const { page, limit, skip } = getPage(request);
    return json(await listOwnerMedia(owner.ownerId, page, limit, skip));
  });
}
