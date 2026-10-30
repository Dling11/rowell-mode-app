import { NextResponse } from "next/server";
import { getSitePolicy } from "@/server/site-policy/service";
import { maintenanceHtml } from "@/server/site-policy/maintenance";

export async function proxy() {
  const policy = await getSitePolicy();
  if (
    policy.mode === "maintenance" ||
    (!policy.available && (policy.configured || Boolean(process.env.VERCEL)))
  ) {
    return new NextResponse(maintenanceHtml(), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "300",
        "X-Robots-Tag": "noindex",
      },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/projects/:path*",
    "/downloads",
    "/updates/:path*",
    "/gallery",
    "/about",
  ],
};
