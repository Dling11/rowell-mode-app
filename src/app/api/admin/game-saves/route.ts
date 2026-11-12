import { handleAdmin, json, readJson } from "@/server/http";
import { createSaveFolder, listSaveFolders } from "@/server/db/game-saves";
import { folderSchema } from "@/features/game-saves/model/schema";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleAdmin(request, false, async (owner) =>
    json(await listSaveFolders(owner.ownerId)),
  );
}
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) =>
    json(
      await createSaveFolder(
        owner.ownerId,
        (await readJson(request, folderSchema)).name,
      ),
      201,
    ),
  );
}
