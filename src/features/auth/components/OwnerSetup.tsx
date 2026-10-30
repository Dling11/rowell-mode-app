"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { usePrivateSetupCode } from "../hooks/usePrivateSetupCode";
import styles from "./OwnerAccess.module.css";

export function OwnerSetup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [linkCode, clearLinkCode] = usePrivateSetupCode();
  const setupCode = linkCode || code;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={styles.form}
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const data = new FormData(event.currentTarget);
        const password = String(data.get("password"));
        if (password !== data.get("confirm")) {
          setError("The passwords don’t match.");
          return;
        }
        setBusy(true);
        try {
          const result = await authClient.signUp.email(
            {
              name: String(data.get("name")),
              username: String(data.get("username")),
              password,
              email: "owner@rowell-mode.local",
            },
            { headers: { "x-owner-setup": setupCode } },
          );
          if (result.error)
            setError(
              result.error.message ||
                "Owner setup didn’t finish. Please try again.",
            );
          else {
            setCode("");
            clearLinkCode();
            router.replace("/admin");
            router.refresh();
          }
        } catch {
          setError("Owner setup is temporarily unavailable. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Display name
        <input
          name="name"
          autoComplete="name"
          defaultValue="Rowell"
          required
          maxLength={80}
          disabled={busy}
        />
      </label>
      <label className="field">
        Username
        <input
          name="username"
          autoComplete="username"
          defaultValue="rowell"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[a-zA-Z0-9_.]{3,30}"
          required
          minLength={3}
          maxLength={30}
          disabled={busy}
        />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          disabled={busy}
        />
      </label>
      <label className="field">
        Confirm password
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          disabled={busy}
        />
      </label>
      <p className={styles.hint}>
        Use a password of at least 12 characters. You can add fingerprint or
        device unlock after signing in.
      </p>
      {!linkCode && (
        <label className="field">
          Private setup code
          <input
            type="password"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={busy}
          />
        </label>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy || !setupCode}>
        {busy ? "Creating your account…" : "Create owner account"}
      </button>
    </form>
  );
}
