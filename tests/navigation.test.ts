import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerDestination } from "../src/features/auth/model/navigation";

test("owner sign-in only redirects to approved local owner destinations", () => {
  assert.equal(ownerDestination("/install"), "/install");
  assert.equal(ownerDestination("/gallery"), "/gallery");
  assert.equal(ownerDestination("/updates"), "/updates");
  for (const value of [
    undefined,
    "/admin",
    "https://untrusted.example",
    "//untrusted.example",
    "/install?redirect=elsewhere",
    "/gallery?redirect=elsewhere",
    "/api/auth/sign-up/email",
  ])
    assert.equal(ownerDestination(value), "/admin");
});
