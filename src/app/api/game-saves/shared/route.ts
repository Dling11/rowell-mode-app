import { json } from "@/server/http";
import { findSaveFolder, folderDto } from "@/server/db/game-saves";
import { handleShared, uploadSave } from "@/server/game-saves/service";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  return handleShared(request, async (access) =>
    json(folderDto(await findSaveFolder(access))),
  );
}
export async function POST(request: Request) {
  return handleShared(request, (access) => uploadSave(request, access));
}
