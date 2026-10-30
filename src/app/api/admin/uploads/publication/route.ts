import { getDatabase } from "@/server/db/client";
import { mediaPublicationSchema } from "@/features/uploads/model/schema";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) => {
    const input = await readJson(request, mediaPublicationSchema);
    const db = await getDatabase();
    const previous = await db
      .collection("media")
      .findOne({ id: input.id, ownerId: owner.ownerId });
    if (!previous?.previewUrl)
      throw new HttpError(404, "This verified image is unavailable.");
    if ((previous.updatedAt || previous.createdAt) !== input.updatedAt)
      throw new HttpError(409, "This image changed. Reload the library.");
    const now = new Date().toISOString();
    const result = await db.collection("media").updateOne(
      {
        _id: previous._id,
        updatedAt: previous.updatedAt ?? { $exists: false },
      },
      {
        $set: {
          alt: input.alt,
          caption: input.caption,
          publishedAt: input.publish ? previous.publishedAt || now : null,
          updatedAt: now,
        },
      },
    );
    if (!result.matchedCount)
      throw new HttpError(409, "This image changed. Reload the library.");
    return json({ ok: true });
  });
}
