import type { BrowserContext } from "@playwright/test";
import { signJWT } from "better-auth/crypto";
import { serializeSignedCookie } from "better-call";

export async function signIn(context: BrowserContext, ownerId = "987654321") {
  const secret = process.env.HUB_TEST_AUTH_SECRET!;
  const sessionToken = `isolated-test-session-${ownerId}`;
  const now = new Date().toISOString();
  const token = await signJWT(
    {
      session: {
        id: "test-session",
        token: sessionToken,
        userId: ownerId,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      user: {
        id: ownerId,
        name: "Preview test owner",
        username: "testowner",
        email: "test@example.invalid",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        isOwner: ownerId === "987654321",
      },
      updatedAt: Date.now(),
      version: "1",
    },
    secret,
    60,
  );
  const signedSession = await serializeSignedCookie(
    "better-auth.session_token",
    sessionToken,
    secret,
    { path: "/" },
  );
  const sessionValue = signedSession
    .split(";")[0]
    .slice("better-auth.session_token=".length);
  await context.addCookies([
    {
      name: "better-auth.session_data",
      value: token,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "better-auth.session_token",
      value: sessionValue,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
