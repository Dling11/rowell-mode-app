import "server-only";
import type { BetterAuthPlugin, User } from "better-auth";
import {
  APIError,
  createAuthEndpoint,
  freshSessionMiddleware,
  sessionMiddleware,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import {
  pinSignInSchema,
  pinChangeSchema,
} from "@/features/auth/model/pin-schema";

export function ownerPin() {
  return {
    id: "owner-pin",
    endpoints: {
      signInOwnerPin: createAuthEndpoint(
        "/sign-in/owner-pin",
        {
          method: "POST",
          body: pinSignInSchema,
          requireHeaders: true,
        },
        async (ctx) => {
          const user = await ctx.context.adapter.findOne<
            User & { isOwner: boolean }
          >({ model: "user", where: [{ field: "isOwner", value: true }] });
          const account = user
            ? await ctx.context.internalAdapter.findAccountByKey({
                providerId: "owner-pin",
                accountId: user.id,
              })
            : null;
          if (
            !user?.isOwner ||
            !account?.password ||
            account.userId !== user.id
          ) {
            await ctx.context.password.hash(ctx.body.pin);
            throw new APIError("UNAUTHORIZED", {
              message: "PIN sign-in failed.",
            });
          }
          if (
            !(await ctx.context.password.verify({
              hash: account.password,
              password: ctx.body.pin,
            }))
          )
            throw new APIError("UNAUTHORIZED", {
              message: "PIN sign-in failed.",
            });
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          if (!session)
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Sign-in could not finish.",
            });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ ok: true });
        },
      ),
      ownerPinStatus: createAuthEndpoint(
        "/owner-pin/status",
        {
          method: "GET",
          use: [sessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user as User & { isOwner?: boolean };
          if (!user.isOwner)
            throw new APIError("FORBIDDEN", {
              message: "Owner access required.",
            });
          const account = await ctx.context.internalAdapter.findAccountByKey({
            providerId: "owner-pin",
            accountId: user.id,
          });
          return ctx.json({ configured: Boolean(account?.password) });
        },
      ),
      setOwnerPin: createAuthEndpoint(
        "/owner-pin/set",
        {
          method: "POST",
          body: pinChangeSchema,
          use: [freshSessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user as User & { isOwner?: boolean };
          if (!user.isOwner)
            throw new APIError("FORBIDDEN", {
              message: "Owner access required.",
            });
          const password =
            await ctx.context.internalAdapter.findCredentialAccount(user.id);
          if (
            !password?.password ||
            !(await ctx.context.password.verify({
              hash: password.password,
              password: ctx.body.currentPassword,
            }))
          )
            throw new APIError("UNAUTHORIZED", {
              message: "Check your current password.",
            });
          const account = await ctx.context.internalAdapter.findAccountByKey({
            providerId: "owner-pin",
            accountId: user.id,
          });
          const hash = await ctx.context.password.hash(ctx.body.pin);
          if (account)
            await ctx.context.internalAdapter.updateAccount(account.id, {
              password: hash,
            });
          else
            await ctx.context.internalAdapter.linkAccount({
              userId: user.id,
              providerId: "owner-pin",
              accountId: user.id,
              password: hash,
            });
          return ctx.json({ ok: true });
        },
      ),
      removeOwnerPin: createAuthEndpoint(
        "/owner-pin/remove",
        {
          method: "POST",
          body: z
            .object({ currentPassword: z.string().min(1).max(128) })
            .strict(),
          use: [freshSessionMiddleware],
          requireHeaders: true,
        },
        async (ctx) => {
          const user = ctx.context.session.user as User & { isOwner?: boolean };
          if (!user.isOwner)
            throw new APIError("FORBIDDEN", {
              message: "Owner access required.",
            });
          const password =
            await ctx.context.internalAdapter.findCredentialAccount(user.id);
          if (
            !password?.password ||
            !(await ctx.context.password.verify({
              hash: password.password,
              password: ctx.body.currentPassword,
            }))
          )
            throw new APIError("UNAUTHORIZED", {
              message: "Check your current password.",
            });
          const account = await ctx.context.internalAdapter.findAccountByKey({
            providerId: "owner-pin",
            accountId: user.id,
          });
          if (account)
            await ctx.context.internalAdapter.deleteAccount(account.id);
          return ctx.json({ ok: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
