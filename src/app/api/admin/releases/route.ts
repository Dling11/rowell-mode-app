import { getDatabase } from "@/server/db/client";
import { verifyRelease } from "@/server/releases/service";
import { releasePointerSchema } from "@/features/downloads/model/release-schema";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {return handleAdmin(request,false,async()=>json(await (await getDatabase()).collection("releases").find({},{projection:{_id:0,projectId:1,platform:1,pointer:1,verifiedAt:1}}).limit(10).toArray()));}
export async function POST(request:Request) {return handleAdmin(request,true,async()=>{
  const pointer=await readJson(request,releasePointerSchema);
  try { await verifyRelease(pointer); } catch { throw new HttpError(400,"That published release asset could not be verified. Approval was not changed."); }
  await (await getDatabase()).collection("releases").updateOne({projectId:pointer.projectId,platform:pointer.platform},{$set:{pointer,verifiedAt:new Date().toISOString(),schemaVersion:1}},{upsert:true});
  return json({ok:true});
});}
