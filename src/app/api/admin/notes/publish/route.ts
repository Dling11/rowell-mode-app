import { publishNoteSchema } from "@/features/notes/model/schema";
import { publishNoteCopy } from "@/server/db/note-publication";
import { handleAdmin, readJson, json } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) =>
    json(
      await publishNoteCopy(
        owner.ownerId,
        await readJson(request, publishNoteSchema),
      ),
    ),
  );
}
