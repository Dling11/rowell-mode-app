import "server-only";
import { databaseConfigured, getDatabase } from "@/server/db/client";
import type { PublicUpdate } from "@/features/updates/model/types";

export async function getPublicUpdates(): Promise<{ updates:PublicUpdate[]; unavailable:boolean }> {
  if (!databaseConfigured()) return { updates:[], unavailable:false };
  try {
    const records = await (await getDatabase()).collection("updates").find({ publishedAt: { $type: "string" } }, { projection: { _id:0, id:1, title:1, body:1, projectId:1, status:1, publishedAt:1 } }).sort({ publishedAt:-1 }).limit(30).toArray();
    return { updates: records.map(record=>({id:String(record.id), title:String(record.title), body:String(record.body), projectId:String(record.projectId), status:String(record.status), publishedAt:String(record.publishedAt)})), unavailable:false };
  } catch { return { updates:[], unavailable:true }; }
}

export async function getPublicUpdate(id:string):Promise<{update:PublicUpdate|null;unavailable:boolean}> {
  if (!databaseConfigured() || !/^[a-f0-9-]{36}$/.test(id)) return {update:null,unavailable:false};
  try {
    const record=await (await getDatabase()).collection("updates").findOne({id,publishedAt:{$type:"string"}},{projection:{_id:0,id:1,title:1,body:1,projectId:1,status:1,publishedAt:1}});
    return {update:record?{id:String(record.id),title:String(record.title),body:String(record.body),projectId:String(record.projectId),status:String(record.status),publishedAt:String(record.publishedAt)}:null,unavailable:false};
  } catch {return {update:null,unavailable:true};}
}
