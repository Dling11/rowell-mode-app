import { getDatabase } from "@/server/db/client";
import { getSitePolicy } from "@/server/site-policy/service";
import { handleAdmin, json } from "@/server/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {return handleAdmin(request,false,async owner=>{
  const db=await getDatabase();
  const [notes,drafts,published,media,clicks,policy]=await Promise.all([
    db.collection("notes").countDocuments({ownerId:owner.ownerId}),
    db.collection("updates").countDocuments({publishedAt:null}),
    db.collection("updates").countDocuments({publishedAt:{$type:"string"}}),
    db.collection("media").countDocuments({ownerId:owner.ownerId}),
    db.collection("clickCounts").find({},{projection:{_id:1,count:1}}).limit(10).toArray(),
    getSitePolicy(),
  ]);
  return json({notes,drafts,published,media,clicks:clicks.map(c=>({id:String(c._id),count:Number(c.count)||0})),policy});
});}
