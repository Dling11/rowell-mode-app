import test from "node:test";
import assert from "node:assert/strict";
import {
  pinSignInSchema,
  pinChangeSchema,
} from "../src/features/auth/model/pin-schema";
test("PIN authentication accepts only bounded digit strings and changes require a password", () => {
  const pin = "2468024680246802";
  assert.equal(pinSignInSchema.safeParse({ pin }).success, true);
  for (const value of [
    "123",
    "1234abcd",
    "1".repeat(65),
    123456789,
    "1234 5678",
  ])
    assert.equal(pinSignInSchema.safeParse({ pin: value }).success, false);
  assert.equal(
    pinSignInSchema.safeParse({ pin, isOwner: true }).success,
    false,
  );
  assert.equal(pinChangeSchema.safeParse({ pin }).success, false);
  assert.equal(
    pinChangeSchema.safeParse({ pin, currentPassword: "test-password" })
      .success,
    true,
  );
});
