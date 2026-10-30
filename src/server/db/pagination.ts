import { HttpError } from "@/server/http";
export function getPage(request:Request) {
  const page=Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isInteger(page) || page<1 || page>1000) throw new HttpError(400,"Invalid page.");
  return {page,limit:20,skip:(page-1)*20};
}
