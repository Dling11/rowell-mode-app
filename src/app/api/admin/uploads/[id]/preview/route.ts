import { getDatabase } from "@/server/db/client";
import type { StoredMedia } from "@/server/db/media";
import { deliverMedia } from "@/server/media/delivery";
import { handleAdmin, HttpError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAdmin(request, false, async (owner) => {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id))
      throw new HttpError(404, "Image not found.");
    const record = await (
      await getDatabase()
    )
      .collection<StoredMedia>("media")
      .findOne({ id, ownerId: owner.ownerId });
    if (!record) throw new HttpError(404, "Image not found.");
    return deliverMedia(record);
  });
}
