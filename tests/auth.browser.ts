import { test, expect, type Page } from "@playwright/test";

async function call(page: Page, path: string, body?: unknown, setup?: string) {
  return page.evaluate(
    async ({ path, body, setup }) => {
      const response = await fetch(`/api/auth${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(setup ? { "x-owner-setup": setup } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, body, setup },
  );
}

async function createAssertion(page: Page, options: unknown) {
  return page.evaluate(async (raw) => {
    const options = raw as {
      challenge: string;
      allowCredentials?: { id: string }[];
    };
    const decode = (value: string) =>
      Uint8Array.from(
        atob(value.replace(/-/g, "+").replace(/_/g, "/")),
        (letter) => letter.charCodeAt(0),
      );
    const publicKey = {
      ...options,
      challenge: decode(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        type: "public-key" as const,
        id: decode(item.id),
      })),
    };
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;
    return credential.toJSON();
  }, options);
}

test("owner credentials, private enrollment, passkeys and password changes use the real auth protocol", async ({
  page,
  context,
}) => {
  await page.goto("http://localhost:3104/");
  const account = {
    email: "owner@rowell-mode.local",
    name: "Isolated owner",
    username: "testowner",
    password: "isolated-test-password-2026",
  };
  expect((await call(page, "/sign-up/email", account)).status).toBe(403);
  const enrolled = await call(
    page,
    "/sign-up/email",
    account,
    "isolated-owner-setup-code",
  );
  expect(enrolled.status).toBe(200);
  expect(enrolled.data.user.isOwner).toBe(true);
  expect(JSON.stringify(enrolled.data)).not.toContain(account.password);
  expect(
    (
      await call(
        page,
        "/sign-up/email",
        {
          ...account,
          email: "second@example.invalid",
          username: "secondowner",
        },
        "isolated-owner-setup-code",
      )
    ).status,
  ).toBe(403);
  expect(
    (await call(page, "/sign-up/email", account, "wrong-code")).status,
  ).toBe(429);
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  const registration = await call(page, "/passkey/generate-register-options");
  expect(registration.status).toBe(200);
  const registered = await page.evaluate(async (options) => {
    const decode = (value: string) =>
      Uint8Array.from(
        atob(value.replace(/-/g, "+").replace(/_/g, "/")),
        (letter) => letter.charCodeAt(0),
      );
    options.challenge = decode(options.challenge);
    options.user.id = decode(options.user.id);
    options.excludeCredentials = options.excludeCredentials?.map(
      (item: { id: string }) => ({ ...item, id: decode(item.id) }),
    );
    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as PublicKeyCredential;
    return credential.toJSON();
  }, registration.data);
  expect(
    (
      await call(page, "/passkey/verify-registration", {
        response: registered,
        name: "Virtual test device",
      })
    ).status,
  ).toBe(200);
  expect((await call(page, "/passkey/list-user-passkeys")).data).toHaveLength(
    1,
  );
  await call(page, "/sign-out", {});
  expect((await call(page, "/get-session")).data).toBeNull();
  expect((await call(page, "/passkey/generate-register-options")).status).toBe(
    401,
  );
  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId,
    isUserVerified: false,
  });
  const unverifiedOptions = await call(
    page,
    "/passkey/generate-authenticate-options",
  );
  const unverifiedAssertion = await createAssertion(page, {
    ...unverifiedOptions.data,
    userVerification: "discouraged",
  });
  expect(
    (
      await call(page, "/passkey/verify-authentication", {
        response: unverifiedAssertion,
      })
    ).status,
  ).toBe(401);
  expect((await call(page, "/get-session")).data).toBeNull();
  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId,
    isUserVerified: true,
  });
  const authentication = await call(
    page,
    "/passkey/generate-authenticate-options",
  );
  expect(authentication.status).toBe(200);
  const assertion = await page.evaluate(async (options) => {
    const decode = (value: string) =>
      Uint8Array.from(
        atob(value.replace(/-/g, "+").replace(/_/g, "/")),
        (letter) => letter.charCodeAt(0),
      );
    options.challenge = decode(options.challenge);
    options.allowCredentials = options.allowCredentials?.map(
      (item: { id: string }) => ({ ...item, id: decode(item.id) }),
    );
    const credential = (await navigator.credentials.get({
      publicKey: options,
    })) as PublicKeyCredential;
    return credential.toJSON();
  }, authentication.data);
  expect(
    (
      await call(page, "/passkey/verify-authentication", {
        response: assertion,
      })
    ).status,
  ).toBe(200);
  expect((await call(page, "/get-session")).data.user.isOwner).toBe(true);
  expect(
    (
      await call(page, "/passkey/verify-authentication", {
        response: assertion,
      })
    ).status,
  ).not.toBe(200);
  await call(page, "/sign-out", {});
  expect(
    (
      await call(page, "/sign-in/username", {
        username: account.username,
        password: "wrong-password",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await call(page, "/sign-in/username", {
        username: account.username,
        password: account.password,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await call(page, "/change-password", {
        currentPassword: "wrong-password",
        newPassword: "new-test-password-2026",
      })
    ).status,
  ).not.toBe(200);
  expect(
    (
      await call(page, "/change-password", {
        currentPassword: account.password,
        newPassword: "new-test-password-2026",
        revokeOtherSessions: true,
      })
    ).status,
  ).toBe(200);
  await call(page, "/sign-out", {});
  expect(
    (
      await call(page, "/sign-in/username", {
        username: account.username,
        password: account.password,
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await call(page, "/sign-in/username", {
        username: account.username,
        password: "new-test-password-2026",
      })
    ).status,
  ).toBe(200);
  const rejected = await context.request.post(
    "http://localhost:3104/api/auth/sign-in/username",
    {
      headers: { Origin: "https://untrusted.example" },
      data: { username: account.username, password: "new-test-password-2026" },
    },
  );
  expect(rejected.status()).toBe(403);
  const testPin = "2468024680246802";
  const passwordNow = "new-test-password-2026";
  expect(
    (
      await call(page, "/owner-pin/set", {
        pin: testPin,
        currentPassword: "wrong-password",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await call(page, "/owner-pin/set", {
        pin: testPin,
        currentPassword: passwordNow,
      })
    ).status,
  ).toBe(200);
  const pinStatus = await call(page, "/owner-pin/status");
  expect(pinStatus.data).toEqual({ configured: true });
  expect(JSON.stringify(pinStatus.data)).not.toContain(testPin);
  await call(page, "/sign-out", {});
  expect(
    (
      await call(page, "/owner-pin/set", {
        pin: testPin,
        currentPassword: passwordNow,
      })
    ).status,
  ).toBe(401);
  const pinLogin = await call(page, "/sign-in/owner-pin", { pin: testPin });
  expect(pinLogin.status).toBe(200);
  expect(pinLogin.data).toEqual({ ok: true });
  expect((await call(page, "/get-session")).data.user.isOwner).toBe(true);
  const pinOrigin = await context.request.post(
    "http://localhost:3104/api/auth/sign-in/owner-pin",
    {
      headers: { Origin: "https://untrusted.example" },
      data: { pin: testPin },
    },
  );
  expect(pinOrigin.status()).toBe(403);
  expect(
    (await call(page, "/sign-in/owner-pin", { pin: "9999999999999999" }))
      .status,
  ).toBe(401);
  expect(
    (
      await call(page, "/owner-pin/remove", {
        currentPassword: "wrong-password",
      })
    ).status,
  ).toBe(401);
  expect(
    (await call(page, "/owner-pin/remove", { currentPassword: passwordNow }))
      .status,
  ).toBe(200);
  expect((await call(page, "/owner-pin/status")).data).toEqual({
    configured: false,
  });
  await call(page, "/sign-out", {});
  expect(
    (await call(page, "/owner-pin/remove", { currentPassword: passwordNow }))
      .status,
  ).toBe(401);
  expect(
    (await call(page, "/sign-in/owner-pin", { pin: testPin })).status,
  ).toBe(401);
  const pinAttempts = [];
  for (let index = 0; index < 6; index++)
    pinAttempts.push(
      (await call(page, "/sign-in/owner-pin", { pin: "9999999999999999" }))
        .status,
    );
  expect(pinAttempts).toContain(429);
});
