import { z } from "zod";
import { handleAdmin, readJson, json } from "@/server/http";
import { refreshResearch } from "@/server/db/research";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleAdmin(request, true, async (owner) => {
    const id = z.string().uuid().parse((await context.params).id);
    const input = await readJson(request, z.object({ updatedAt: z.string().datetime() }).strict());
    return json(await refreshResearch(owner.ownerId, id, input.updatedAt));
  });
}
