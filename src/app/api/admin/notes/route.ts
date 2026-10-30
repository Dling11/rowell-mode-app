import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { getPage } from "@/server/db/pagination";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
import { noteSchema, deleteNoteSchema } from "@/features/notes/model/schema";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request) { return handleAdmin(request,false,async owner=>{
  const {page,limit,skip}=getPage(request);
  const records=await (await getDatabase()).collection("notes").find({ownerId:owner.ownerId},{projection:{_id:0,id:1,title:1,body:1,updatedAt:1}}).sort({updatedAt:-1}).skip(skip).limit(limit+1).toArray();
  return json({items:records.slice(0,limit),nextPage:records.length>limit?page+1:null});
}); }
export async function POST(request:Request) { return handleAdmin(request,true,async owner=>{
  const input=await readJson(request,noteSchema);
  const db=await getDatabase();
  const note={id:input.id || randomUUID(),title:input.title,body:input.body,updatedAt:new Date().toISOString()};
  if (input.id) {
    const result=await db.collection("notes").updateOne({id:input.id,ownerId:owner.ownerId,updatedAt:input.updatedAt},{$set:{title:note.title,body:note.body,updatedAt:note.updatedAt}});
    if (!result.matchedCount) throw new HttpError(409,"This note changed in another window. Reload it before saving.");
  } else await db.collection("notes").insertOne({...note,ownerId:owner.ownerId,schemaVersion:1});
  return json(note);
}); }
export async function DELETE(request:Request) { return handleAdmin(request,true,async owner=>{
  const input=await readJson(request,deleteNoteSchema);
  const result=await (await getDatabase()).collection("notes").deleteOne({...input,ownerId:owner.ownerId});
  if (!result.deletedCount) throw new HttpError(409,"This note changed or was already removed. Reload the list.");
  return json({ok:true});
}); }
