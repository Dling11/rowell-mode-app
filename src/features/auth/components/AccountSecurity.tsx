"use client";
import { useState } from "react";
import { Fingerprint, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "../lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import styles from "@/components/workspace/Workspace.module.css";
import { ProfileForm, type OwnerProfile } from "./ProfileForm";
import { PinSecurity } from "./PinSecurity";

export function AccountSecurity({ profile }: { profile: OwnerProfile }) {
  const {
    data: passkeys,
    isPending,
    error: queryError,
    refetch,
  } = authClient.useListPasskeys();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<{ id: string; name?: string } | null>(
    null,
  );
  async function addPasskey(name: string) {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.passkey.addPasskey({ name });
      if (result.error)
        setError(
          "Passkey setup didn’t finish. Try again; if your session is old, sign in again first.",
        );
      else {
        toast.success("Passkey added");
        await refetch();
      }
    } catch {
      setError("Passkey setup didn’t finish. Your password still works.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">YOUR PRIVATE ACCOUNT</p>
        <h1>Easy access. Just for you.</h1>
        <p>
          Use your password, or add a passkey for fingerprint, device unlock or
          a security key.
        </p>
      </div>
      <ProfileForm key={profile.name} profile={profile} />
      <form
        className={styles.form}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void addPasskey(
            String(new FormData(event.currentTarget).get("name")),
          );
        }}
      >
        <h2>
          <Fingerprint size={22} /> Passkeys
        </h2>
        <label className="field">
          Device label
          <input
            name="name"
            placeholder="My Android phone"
            required
            maxLength={80}
            disabled={busy}
          />
        </label>
        <p>
          Your device keeps the private key and handles its fingerprint or PIN
          prompt. Keep your password as a backup. Adding a passkey requires a
          recent sign-in.
        </p>
        <button className="button" disabled={busy}>
          {busy ? "Waiting for your device…" : "Add a passkey"}
        </button>
        {isPending && <p role="status">Loading passkeys…</p>}
        {queryError && (
          <div role="alert">
            <p>Passkeys couldn’t load.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        )}
        {!isPending && !queryError && !passkeys?.length && (
          <p>No passkeys added yet.</p>
        )}
        <ul className={styles.rows}>
          {passkeys?.map((key) => (
            <li key={key.id} className={styles.row}>
              <span>{key.name || "Passkey"}</span>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setRemove({ id: key.id, name: key.name })}
              >
                Remove {key.name || "passkey"}
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </form>
      <PasswordForm />
      <PinSecurity />
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title="Remove this passkey?"
        description="This device will need your password or another registered passkey to sign in again."
        label="Remove passkey"
        busy={busy}
        onConfirm={async () => {
          if (!remove) return;
          setBusy(true);
          setError("");
          try {
            const result = await authClient.passkey.deletePasskey({
              id: remove.id,
            });
            if (result.error)
              setError("The passkey couldn’t be removed. Please try again.");
            else {
              setRemove(null);
              toast.success("Passkey removed");
              await refetch();
            }
          } catch {
            setError("The passkey couldn’t be removed. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={styles.form}
      style={{ marginTop: 25 }}
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError("");
        if (data.get("newPassword") !== data.get("confirm")) {
          setError("The new passwords don’t match.");
          return;
        }
        setBusy(true);
        try {
          const result = await authClient.changePassword({
            currentPassword: String(data.get("currentPassword")),
            newPassword: String(data.get("newPassword")),
            revokeOtherSessions: true,
          });
          if (result.error)
            setError(
              "The password couldn’t be changed. Check your current password and try again.",
            );
          else {
            form.reset();
            toast.success("Password changed; other sessions signed out");
          }
        } catch {
          setError("The password couldn’t be changed. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>
        <KeyRound size={21} /> Change password
      </h2>
      <label className="field">
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
        />
      </label>
      <label className="field">
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          disabled={busy}
        />
      </label>
      <label className="field">
        Confirm new password
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
      <p>
        Other sessions end when you change your password. An already cached
        session can take up to one minute to expire.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
