import "server-only";
import { z, ZodError } from "zod";
import { getOwner } from "@/server/auth/session";
import { authOrigin } from "@/server/auth/config";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export async function requireOwner(request?: Request, mutation = false) {
  const owner = await getOwner();
  if (!owner) throw new HttpError(401, "Owner sign-in required.");
  if (mutation && request) {
    const origin = request.headers.get("origin");
    const expected = authOrigin();
    if (
      origin !== expected ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(
        403,
        "This request could not be verified. Reload and try again.",
      );
  }
  return owner;
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64 * 1024) {
        await reader.cancel();
        throw new HttpError(413, "This request is too large.");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    let data: unknown;
    try {
      data = JSON.parse(body.toString("utf8"));
    } catch {
      throw new HttpError(400, "Invalid JSON data.");
    }
    return schema.parse(data);
  } finally {
    reader.releaseLock();
  }
}

export async function handleAdmin(
  request: Request,
  mutation: boolean,
  work: (
    owner: NonNullable<Awaited<ReturnType<typeof getOwner>>>,
  ) => Promise<Response>,
) {
  try {
    const owner = await requireOwner(request, mutation);
    return await work(owner);
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json({ error: "Check the form fields and try again." }, 400);
    return json(
      { error: "The service is temporarily unavailable. Please try again." },
      503,
    );
  }
}
