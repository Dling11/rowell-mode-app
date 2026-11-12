import { handleAdmin } from "@/server/http";
import { uploadSave } from "@/server/game-saves/service";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ folder: string }> },
) {
  return handleAdmin(request, true, async (owner) =>
    uploadSave(request, { ownerId: owner.ownerId }, (await params).folder),
  );
}
