import "server-only";
import { databaseConfigured, getDatabase } from "./client";
import type { PublicPhoto } from "@/features/uploads/model/schema";

export async function getPublicGallery(
  page = 1,
): Promise<{
  photos: PublicPhoto[];
  nextPage: number | null;
  unavailable: boolean;
}> {
  if (!databaseConfigured())
    return { photos: [], nextPage: null, unavailable: false };
  try {
    const records = await (
      await getDatabase()
    )
      .collection("media")
      .find(
        { publishedAt: { $type: "string" }, previewUrl: { $type: "string" } },
        { projection: { _id: 0, id: 1, alt: 1, caption: 1, publishedAt: 1 } },
      )
      .sort({ publishedAt: -1, id: 1 })
      .skip((page - 1) * 18)
      .limit(19)
      .toArray();
    return {
      photos: records
        .slice(0, 18)
        .map((record) => ({
          id: String(record.id),
          alt: String(record.alt || "Photograph"),
          caption: String(record.caption || ""),
          publishedAt: String(record.publishedAt),
        })),
      nextPage: records.length > 18 ? page + 1 : null,
      unavailable: false,
    };
  } catch {
    return { photos: [], nextPage: null, unavailable: true };
  }
}
