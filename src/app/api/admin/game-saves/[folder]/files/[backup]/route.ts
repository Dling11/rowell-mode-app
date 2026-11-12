import { z } from "zod";
import { handleAdmin, HttpError, json } from "@/server/http";
import { findSaveFolder, removeSave } from "@/server/db/game-saves";
import { downloadSave } from "@/server/game-saves/service";
import { destroySave } from "@/server/media/save-storage";
type Context = { params: Promise<{ folder: string; backup: string }> };
export const maxDuration = 60;
export async function GET(request: Request, { params }: Context) {
  return handleAdmin(request, false, async (owner) => {
    const { folder, backup } = await params;
    return downloadSave({ ownerId: owner.ownerId }, backup, folder);
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return handleAdmin(request, true, async (owner) => {
    const { folder, backup } = await params;
    z.string().uuid().parse(backup);
    const record = await findSaveFolder({ ownerId: owner.ownerId }, folder);
    const file = record.files.find((f) => f.id === backup);
    if (!file) throw new HttpError(404, "Backup unavailable.");
    await destroySave(file.publicId);
    await removeSave(owner.ownerId, folder, backup, file.bytes);
    return json({ ok: true });
  });
}
