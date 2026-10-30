import { handleAdmin, readJson, json } from "@/server/http";
import { completeUploadSchema } from "@/features/uploads/model/schema";
import { completeUpload } from "@/server/media/upload-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) =>
    json(
      await completeUpload(
        owner.ownerId,
        (await readJson(request, completeUploadSchema)).id,
      ),
    ),
  );
}
