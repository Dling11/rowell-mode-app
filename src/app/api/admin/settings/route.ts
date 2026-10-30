import { getDatabase } from "@/server/db/client";
import { getSitePolicy } from "@/server/site-policy/service";
import { settingsSchema } from "@/features/site-settings/model/policy";
import { handleAdmin, readJson, json, HttpError } from "@/server/http";
import { z } from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {return handleAdmin(request,false,async()=>{
  const policy=await getSitePolicy();
  if (!policy.available) throw new HttpError(503,"Site settings could not be loaded. Downloads are blocked.");
  const record=await (await getDatabase()).collection("settings").findOne({key:"site"});
  return json({settings:settingsSchema.parse(record?.value),updatedAt:record?.updatedAt,effectiveMode:policy.mode,emergencyMode:process.env.SITE_MODE || null});
});}
export async function POST(request:Request) {return handleAdmin(request,true,async()=>{
  const input=await readJson(request,z.object({settings:settingsSchema,updatedAt:z.string().datetime()}).strict());
  const result=await (await getDatabase()).collection("settings").updateOne({key:"site",updatedAt:input.updatedAt},{$set:{value:input.settings,updatedAt:new Date().toISOString(),schemaVersion:1}});
  if (!result.matchedCount) throw new HttpError(409,"Site controls changed in another window. Reload them before saving.");
  return json({ok:true});
});}
