import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { getPage } from "@/server/db/pagination";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
import { updateSchema } from "@/features/updates/model/schema";
import { deleteNoteSchema } from "@/features/notes/model/schema";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request) { return handleAdmin(request,false,async()=>{
  const {page,limit,skip}=getPage(request);
  const records=await (await getDatabase()).collection("updates").find({},{projection:{_id:0,id:1,title:1,body:1,projectId:1,status:1,publishedAt:1,updatedAt:1}}).sort({updatedAt:-1}).skip(skip).limit(limit+1).toArray();
  return json({items:records.slice(0,limit),nextPage:records.length>limit?page+1:null});
}); }
export async function POST(request:Request) { return handleAdmin(request,true,async()=>{
  const input=await readJson(request,updateSchema);
  const db=await getDatabase();
  const previous=input.id?await db.collection("updates").findOne({id:input.id}):null;
  const now=new Date().toISOString();
  const update={id:input.id || randomUUID(),title:input.title,body:input.body,projectId:input.projectId,status:input.status,publishedAt:input.publish?(previous?.publishedAt || now):null,updatedAt:now};
  if (input.id) {
    const result=await db.collection("updates").updateOne({id:input.id,updatedAt:input.updatedAt},{$set:update});
    if (!result.matchedCount) throw new HttpError(409,"This update changed in another window. Reload it before saving.");
  } else await db.collection("updates").insertOne({...update,schemaVersion:1});
  return json(update);
}); }
export async function DELETE(request:Request) { return handleAdmin(request,true,async()=>{
  const input=await readJson(request,deleteNoteSchema);
  const result=await (await getDatabase()).collection("updates").deleteOne(input);
  if (!result.deletedCount) throw new HttpError(409,"This update changed or was already removed. Reload the list.");
  return json({ok:true});
}); }
