import { handleAdmin, json, readJson } from "@/server/http";
import { updateSaveFolder } from "@/server/db/game-saves";
import { folderActionSchema } from "@/features/game-saves/model/schema";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ folder: string }> },
) {
  return handleAdmin(request, true, async (owner) =>
    json(
      await updateSaveFolder(
        owner.ownerId,
        (await params).folder,
        await readJson(request, folderActionSchema),
      ),
    ),
  );
}
