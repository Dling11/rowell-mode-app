import { z } from "zod";
import { getAuth, resetClosedAuthConnection } from "@/server/auth/instance";
import { authConfigured } from "@/server/auth/config";
import { HttpError, readJson } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: Request) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  if (!authConfigured())
    return Response.json(
      { message: "Owner sign-in is not available yet." },
      { status: 503, headers },
    );
  try {
    if (request.method === "POST") await readJson(request.clone(), z.unknown());
    const response = await (await getAuth()).handler(request);
    for (const [key, value] of Object.entries(headers))
      response.headers.set(key, value);
    return response;
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers },
      );
    if (
      error instanceof Error &&
      ["MongoTopologyClosedError", "MongoNotConnectedError"].includes(
        error.name,
      )
    )
      await resetClosedAuthConnection();
    console.error("Owner authentication request failed", {
      type: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json(
      { message: "Sign-in is temporarily unavailable. Please try again." },
      { status: 503, headers },
    );
  }
}
export { handler as GET, handler as POST };
