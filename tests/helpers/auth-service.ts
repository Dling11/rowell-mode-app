import { createServer } from "node:http";
import { getAuth } from "../../src/server/auth/instance";

// Isolated protocol fixture: Better Auth's memory adapter, no Atlas/provider access.
if (
  process.env.MONGODB_URI ||
  process.env.BETTER_AUTH_URL !== "http://localhost:3104"
)
  throw new Error("Auth fixture isolation is required.");
const auth = getAuth();
const server = createServer(async (incoming, outgoing) => {
  if (!incoming.url?.startsWith("/api/auth/")) {
    outgoing.writeHead(200, { "Content-Type": "text/html" });
    outgoing.end(
      "<!doctype html><html lang='en'><title>Isolated auth fixture</title><main><h1>Authentication check</h1></main></html>",
    );
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers))
      if (value)
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    const request = new Request(`http://localhost:3104${incoming.url}`, {
      method: incoming.method,
      headers,
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await (await auth).handler(request);
    const resultHeaders: Record<string, string | string[]> = Object.fromEntries(
      response.headers,
    );
    const cookies = response.headers.getSetCookie();
    if (cookies.length) resultHeaders["set-cookie"] = cookies;
    outgoing.writeHead(response.status, resultHeaders);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500);
    outgoing.end("Isolated auth check failed");
  }
});
server.listen(3104, "127.0.0.1");
