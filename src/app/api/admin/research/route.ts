import { z } from "zod";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
import { getPage } from "@/server/db/pagination";
import { listResearch, saveResearch, deleteResearch } from "@/server/db/research";
import { researchStatuses, saveResearchSchema, researchRevisionSchema } from "@/features/research/model/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return handleAdmin(request, false, async (owner) => {
  const params = new URL(request.url).searchParams;
  const search = params.get("q") || "";
  const status = params.get("status") || "";
  if (search.length > 80 || (status && !z.enum(researchStatuses).safeParse(status).success)) throw new HttpError(400, "Check your search filters.");
  return json(await listResearch(owner.ownerId, getPage(request).page, search, status));
}); }
export async function POST(request: Request) { return handleAdmin(request, true, async (owner) => json(await saveResearch(owner.ownerId, await readJson(request, saveResearchSchema)))); }
export async function DELETE(request: Request) { return handleAdmin(request, true, async (owner) => {
  const input = await readJson(request, researchRevisionSchema);
  await deleteResearch(owner.ownerId, input.id, input.updatedAt);
  return json({ ok: true });
}); }
