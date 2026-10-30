import { handleAdmin, readJson, json } from "@/server/http";
import { uploadIntentSchema } from "@/features/uploads/model/schema";
import { createUploadIntent } from "@/server/media/upload-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) =>
    json(
      await createUploadIntent(
        owner.ownerId,
        await readJson(request, uploadIntentSchema),
      ),
    ),
  );
}
