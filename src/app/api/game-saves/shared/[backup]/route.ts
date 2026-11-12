import { handleShared, downloadSave } from "@/server/game-saves/service";
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ backup: string }> },
) {
  return handleShared(request, async (access) =>
    downloadSave(access, (await params).backup),
  );
}
