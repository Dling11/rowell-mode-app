import { z } from "zod";
export const ownerPinSchema = z.string().min(8).max(64).regex(/^\d+$/);
export const pinSignInSchema = z.object({ pin: ownerPinSchema }).strict();
export const pinChangeSchema = z
  .object({ pin: ownerPinSchema, currentPassword: z.string().min(1).max(128) })
  .strict();
