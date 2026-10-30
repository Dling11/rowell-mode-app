import "server-only";
import { timingSafeEqual } from "node:crypto";
import { betterAuth } from "better-auth/minimal";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { username } from "better-auth/plugins/username";
import { passkey } from "@better-auth/passkey";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { sessionConfigured, authOrigin } from "./config";
import { ownerPin } from "./owner-pin";

declare global {
  var hubAuthMongoPromise: Promise<MongoClient> | undefined;
}

function validSetupCode(value: string | null) {
  const expected = process.env.OWNER_SETUP_TOKEN;
  if (!expected || !value) return false;
  const provided = Buffer.from(value);
  const required = Buffer.from(expected);
  return (
    provided.length === required.length && timingSafeEqual(provided, required)
  );
}

function createAuth(client?: MongoClient) {
  if (!sessionConfigured())
    throw new Error("Owner authentication is not configured.");
  const origin = authOrigin();
  return betterAuth({
    appName: "Rowell-Mode",
    baseURL: origin,
    secret: process.env.BETTER_AUTH_SECRET!,
    database: client
      ? mongodbAdapter(client.db(process.env.MONGODB_DB!), { client })
      : undefined,
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        isOwner: { type: "boolean", defaultValue: true, input: false },
      },
    },
    session: {
      expiresIn: 8 * 60 * 60,
      updateAge: 60 * 60,
      freshAge: 10 * 60,
      cookieCache: { enabled: true, maxAge: 60, strategy: "jwt" },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
        "/sign-in/owner-pin": { window: 60, max: 5 },
        "/owner-pin/set": { window: 60, max: 3 },
        "/owner-pin/remove": { window: 60, max: 3 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    logger: { disabled: true },
    plugins: [
      username(),
      ownerPin(),
      passkey({
        rpName: "Rowell-Mode",
        rpID: new URL(origin).hostname,
        origin,
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        registration: {
          afterVerification: async ({ verification }) => {
            if (!verification.registrationInfo?.userVerified)
              throw new APIError("UNAUTHORIZED", {
                message: "Unlock your device to add a passkey.",
              });
          },
        },
        authentication: {
          afterVerification: async ({ verification }) => {
            if (!verification.authenticationInfo.userVerified)
              throw new APIError("UNAUTHORIZED", {
                message: "Unlock your device to sign in.",
              });
          },
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/unlink-account" &&
          ctx.body?.providerId === "owner-pin"
        )
          throw new APIError("FORBIDDEN", {
            message: "Manage the owner PIN in Profile & security.",
          });
        if (ctx.path === "/sign-up/email") {
          if (!validSetupCode(ctx.headers?.get("x-owner-setup") ?? null))
            throw new APIError("FORBIDDEN", {
              message: "Owner setup requires the private setup link.",
            });
          if (client) {
            const indexes = await client
              .db(process.env.MONGODB_DB!)
              .collection("user")
              .listIndexes()
              .toArray();
            if (
              !indexes.some(
                (index) =>
                  index.unique &&
                  index.key.isOwner === 1 &&
                  index.partialFilterExpression?.isOwner === true,
              )
            )
              throw new APIError("SERVICE_UNAVAILABLE", {
                message: "Initialize the website database before owner setup.",
              });
          }
          const existing = await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "isOwner", value: true }],
          });
          if (existing)
            throw new APIError("FORBIDDEN", {
              message: "The owner account is already set up. Sign in instead.",
            });
        }
        if (ctx.path.startsWith("/sign-up") && ctx.path !== "/sign-up/email")
          throw new APIError("FORBIDDEN", {
            message: "Public registration is disabled.",
          });
        if (["/delete-user", "/change-email"].includes(ctx.path))
          throw new APIError("FORBIDDEN", {
            message: "This operation is unavailable for the owner account.",
          });
      }),
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
let instanceClient: MongoClient | undefined;
export async function getAuth() {
  let client: MongoClient | undefined;
  if (process.env.MONGODB_URI) {
    if (!global.hubAuthMongoPromise) {
      const connection = new MongoClient(process.env.MONGODB_URI, {
        maxPoolSize: 2,
        family: 4,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        timeoutMS: 12000,
      });
      const pending = connection.connect().catch(async (error) => {
        if (global.hubAuthMongoPromise === pending)
          global.hubAuthMongoPromise = undefined;
        await connection.close().catch(() => {});
        throw error;
      });
      global.hubAuthMongoPromise = pending;
    }
    client = await global.hubAuthMongoPromise;
  }
  if (!instance || instanceClient !== client) {
    instance = createAuth(client);
    instanceClient = client;
  }
  return instance;
}

export async function resetClosedAuthConnection() {
  const previous = global.hubAuthMongoPromise;
  global.hubAuthMongoPromise = undefined;
  instance = undefined;
  instanceClient = undefined;
  try {
    await (await previous)?.close();
  } catch {
    /* Failed connection already closed. */
  }
}
