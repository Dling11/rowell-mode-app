"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import styles from "@/components/workspace/Workspace.module.css";
export function PinSecurity() {
  const [currentPassword, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState("");
  async function submit(removing: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/auth/owner-pin/${removing ? "remove" : "set"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            ...(!removing ? { pin } : {}),
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          "PIN settings couldn’t change. Check your password and sign in again if your session is old.",
        );
      setPassword("");
      setPin("");
      setRemove(false);
      toast.success(removing ? "PIN sign-in disabled" : "Owner PIN updated");
    } catch {
      setError(
        "PIN settings couldn’t change. Check your password and sign in again if your session is old.",
      );
      setRemove(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form
        className={styles.form}
        style={{ marginTop: 26 }}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <h2>
          <KeyRound size={21} /> Owner PIN
        </h2>
        <p>
          A separate sign-in option. Updating it requires a recent owner session
          and your current password.
        </p>
        <label className="field">
          Account password for PIN changes
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="field">
          New owner PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={64}
            value={pin}
            disabled={busy}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          />
        </label>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton pending={busy && !remove}
            className="button"
            disabled={busy || !pin || !currentPassword}
          >
            {busy && !remove ? "Updating PIN…" : "Update owner PIN"}
          </ActionButton>
          <button
            type="button"
            className="button secondary"
            disabled={busy || !currentPassword}
            onClick={() => setRemove(true)}
          >
            Disable PIN sign-in
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={remove}
        onOpenChange={setRemove}
        title="Disable PIN sign-in?"
        description="Your password and passkeys will continue to work."
        label="Disable PIN"
        busy={busy}
        onConfirm={() => void submit(true)}
      />
    </>
  );
}
