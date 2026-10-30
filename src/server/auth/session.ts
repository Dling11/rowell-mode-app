import "server-only";
import { headers } from "next/headers";
import { sessionConfigured } from "./config";
import { getAuth } from "./instance";

export async function getOwner() {
  if (!sessionConfigured()) return null;
  try {
    const requestHeaders = await headers();
    if (!requestHeaders.get("cookie")?.includes("better-auth.session_token="))
      return null;
    const session = await (
      await getAuth()
    ).api.getSession({
      headers: requestHeaders,
    });
    return session?.user.isOwner
      ? {
          ownerId: session.user.id,
          name: session.user.name,
          username: session.user.username || "",
        }
      : null;
  } catch {
    return null;
  }
}
