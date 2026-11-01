import { getSitePolicy } from "@/server/site-policy/service";
import { downloadsAllowed } from "@/features/site-settings/model/policy";
import { shouldCountRequest } from "@/features/downloads/model/release-schema";
import { resolveApprovedRelease } from "@/server/releases/service";
import { getDatabase } from "@/server/db/client";
import { downloadUnavailableHtml } from "@/server/site-policy/maintenance";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
type Context={params:Promise<{project:string;platform:string}>};
async function download(request:Request,context:Context) {
  const {project,platform}=await context.params;
  if (!["mh-tri","mh-tri-low-spec","share-mode"].includes(project) || !["android","windows"].includes(platform) || (project === "mh-tri-low-spec" && platform !== "android")) return Response.json({error:"No approved download exists for this project and platform."},{status:404,headers});
  const unavailable=()=>request.headers.get("accept")?.includes("text/html")
    ? new Response(downloadUnavailableHtml(),{status:503,headers:{...headers,"Retry-After":"300","Content-Type":"text/html; charset=utf-8"}})
    : Response.json({error:"Downloads are temporarily unavailable. Please check back soon."},{status:503,headers:{...headers,"Retry-After":"300"}});
  try {
    if (!downloadsAllowed(await getSitePolicy(),project)) return unavailable();
    const release=await resolveApprovedRelease(project,platform);
    if (!downloadsAllowed(await getSitePolicy(),project)) return unavailable();
    if (shouldCountRequest(request)) {
      try {
        await (await getDatabase()).collection<{_id:string;count:number}>("clickCounts").updateOne({_id:`${project}:${platform}`},{$inc:{count:1}},{upsert:true});
      } catch { /* A count failure must not be presented as a completed download. */ }
    }
    return new Response(null,{status:307,headers:{...headers,Location:release.url}});
  } catch { return unavailable(); }
}
export { download as GET, download as HEAD };
