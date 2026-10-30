import "server-only";
import { getDatabase } from "@/server/db/client";
import { releasePointerSchema, repositories, validatePublishedAsset, type ReleasePointer } from "@/features/downloads/model/release-schema";

export async function verifyRelease(pointer:ReleasePointer) {
  const response=await fetch(`https://api.github.com/repos/${repositories[pointer.projectId]}/releases/tags/${encodeURIComponent(pointer.tag)}`,{
    headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(process.env.GITHUB_RELEASE_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_RELEASE_TOKEN}`} : {})},
    next:{revalidate:60}, signal:AbortSignal.timeout(6000), redirect:"error",
  });
  if (!response.ok) throw new Error("Release lookup failed");
  return validatePublishedAsset(await response.json(),pointer);
}
export async function resolveApprovedRelease(projectId:string,platform:string) {
  const record=await (await getDatabase()).collection("releases").findOne({projectId,platform});
  const pointer=releasePointerSchema.parse(record?.pointer);
  if (pointer.projectId!==projectId || pointer.platform!==platform) throw new Error("Invalid approval");
  return {pointer,...await verifyRelease(pointer)};
}
